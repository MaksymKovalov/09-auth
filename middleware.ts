import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { debugCookies, logAuthDebug } from './lib/utils/authDebug';

const AUTH_PAGES = ['/sign-in', '/sign-up'];
const PROTECTED_PREFIXES = ['/profile', '/notes'];

const isAuthPage = (pathname: string) => AUTH_PAGES.includes(pathname);
const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const skipMiddleware = (pathname: string) =>
  pathname.startsWith('/_next') ||
  pathname.startsWith('/api') ||
  pathname === '/' ||
  pathname === '/favicon.ico' ||
  pathname === '/sitemap.xml' ||
  pathname === '/robots.txt';

const extractSetCookies = (headers: Headers): string[] => {
  if ('getSetCookie' in headers && typeof (headers as Headers & { getSetCookie(): string[] }).getSetCookie === 'function') {
    return (headers as Headers & { getSetCookie(): string[] }).getSetCookie();
  }

  const header = headers.get('set-cookie');
  return header ? [header] : [];
};

const mergeCookieHeader = (existingCookie: string, refreshedCookies: string[]): string => {
  if (!refreshedCookies.length) return existingCookie;

  const cookieMap = new Map<string, string>();

  const registerPair = (pair: string) => {
    const [name, ...rest] = pair.trim().split('=');
    if (name && rest.length) {
      cookieMap.set(name, rest.join('='));
    }
  };

  existingCookie
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach(registerPair);

  refreshedCookies.forEach((cookieStr) => {
    const [pair] = cookieStr.split(';');
    registerPair(pair);
  });

  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
};

const removeAuthCookies = (cookieHeader: string): string =>
  cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.startsWith('accessToken=') && !part.startsWith('refreshToken='))
    .join('; ');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const incomingCookieHeader = request.headers.get('cookie') ?? '';

  const initialAccessToken = request.cookies.get('accessToken')?.value ?? '';
  const initialRefreshToken = request.cookies.get('refreshToken')?.value ?? '';
  let hasAccessToken = Boolean(initialAccessToken);
  let hasRefreshToken = Boolean(initialRefreshToken);

  logAuthDebug('middleware:request', {
    pathname,
    incomingCookies: debugCookies(incomingCookieHeader),
    hasAccessToken,
    hasRefreshToken,
  });

  if (skipMiddleware(pathname)) {
    const response = NextResponse.next();
    response.headers.set('x-middleware-cache', 'no-cache');
    logAuthDebug('middleware:skip', { pathname });
    return response;
  }

  let cookieHeader = request.headers.get('cookie') ?? '';
  const requestHeaders = new Headers(request.headers);
  const responseCookies: string[] = [];

  const applyUpdatedCookieHeader = (updatedHeader: string) => {
    cookieHeader = updatedHeader;

    if (updatedHeader && updatedHeader.length > 0) {
      requestHeaders.set('cookie', updatedHeader);
    } else {
      requestHeaders.delete('cookie');
    }

    const parsedState = debugCookies(updatedHeader);
    hasAccessToken = parsedState.hasAccessToken;
    hasRefreshToken = parsedState.hasRefreshToken;
  };

  if (!hasAccessToken && hasRefreshToken) {
    try {
      const sessionResponse = await fetch(new URL('/api/auth/session', request.url), {
        headers: {
          cookie: cookieHeader,
        },
        cache: 'no-store',
      });

      logAuthDebug('middleware:session-response', {
        status: sessionResponse.status,
        redirected: sessionResponse.redirected,
      });

      const setCookies = extractSetCookies(sessionResponse.headers);
      responseCookies.push(...setCookies);

      if (setCookies.length) {
        logAuthDebug('middleware:set-cookie', {
          names: setCookies.map((cookieStr) => cookieStr.split(';')[0]?.split('=')[0]),
        });
      }

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json().catch(() => null);
        if (sessionData) {
          if (setCookies.length) {
            applyUpdatedCookieHeader(mergeCookieHeader(cookieHeader, setCookies));
          } else {
            const parsedState = debugCookies(cookieHeader);
            hasAccessToken = parsedState.hasAccessToken;
            hasRefreshToken = parsedState.hasRefreshToken;
          }
          logAuthDebug('middleware:session-restored', {
            hasAccessToken,
            cookerAfterRestore: debugCookies(cookieHeader),
          });
        } else {
          applyUpdatedCookieHeader(removeAuthCookies(cookieHeader));
          logAuthDebug('middleware:session-empty', {});
        }
      } else {
        applyUpdatedCookieHeader(removeAuthCookies(cookieHeader));
        logAuthDebug('middleware:session-failed', { status: sessionResponse.status });
      }
    } catch (error) {
      applyUpdatedCookieHeader(removeAuthCookies(cookieHeader));
      logAuthDebug('middleware:session-error', {
        message: error instanceof Error ? error.message : 'unknown-error',
      });
    }
  }

  if (!hasAccessToken && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/sign-in';
    const targetPath = `${pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set('redirect', targetPath);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    responseCookies.forEach((cookie) => redirectResponse.headers.append('set-cookie', cookie));
    redirectResponse.headers.set('x-middleware-cache', 'no-cache');
    logAuthDebug('middleware:redirect-to-login', {
      pathname,
      targetPath,
      hasAccessToken,
      hasRefreshToken,
    });
    return redirectResponse;
  }

  if (hasAccessToken && isAuthPage(pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/profile';
    const redirectResponse = NextResponse.redirect(destination);
    responseCookies.forEach((cookie) => redirectResponse.headers.append('set-cookie', cookie));
    redirectResponse.headers.set('x-middleware-cache', 'no-cache');
    logAuthDebug('middleware:redirect-to-profile', {
      pathname,
      hasAccessToken,
      hasRefreshToken,
    });
    return redirectResponse;
  }

  const response = NextResponse.next({
    request: cookieHeader !== request.headers.get('cookie') ? { headers: requestHeaders } : undefined,
  });
  responseCookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
  response.headers.set('x-middleware-cache', 'no-cache');
  logAuthDebug('middleware:next', {
    pathname,
    responseCookies: responseCookies.map((cookieStr) => cookieStr.split(';')[0]?.split('=')[0]),
  });
  return response;
}

export const config = {
  matcher: ['/profile/:path*', '/notes/:path*', '/sign-in', '/sign-up'],
};