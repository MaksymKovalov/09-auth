import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_PAGES = ['/sign-in', '/sign-up'];
const PROTECTED_PREFIXES = ['/profile', '/notes'];
const isDebug = process.env.NODE_ENV !== 'production';

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

  if (skipMiddleware(pathname)) {
    const response = NextResponse.next();
    response.headers.set('x-middleware-cache', 'no-cache');
    return response;
  }

  let hasAccessToken = request.cookies.has('accessToken');
  const hasRefreshToken = request.cookies.has('refreshToken');
  let cookieHeader = request.headers.get('cookie') ?? '';
  const requestHeaders = new Headers(request.headers);
  const responseCookies: string[] = [];

  const applyUpdatedCookieHeader = (headerValue: string | null) => {
    cookieHeader = headerValue ?? '';
    if (headerValue && headerValue.length > 0) {
      requestHeaders.set('cookie', headerValue);
    } else {
      requestHeaders.delete('cookie');
    }
  };

  if (!hasAccessToken && hasRefreshToken) {
    try {
      const sessionResponse = await fetch(new URL('/api/auth/session', request.url), {
        headers: {
          cookie: cookieHeader,
        },
        cache: 'no-store',
      });

      if (isDebug) {
        console.debug('[middleware] session refresh status', sessionResponse.status);
      }

      const setCookies = extractSetCookies(sessionResponse.headers);
      responseCookies.push(...setCookies);

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json().catch(() => null);
        if (sessionData) {
          hasAccessToken = true;
          if (setCookies.length) {
            applyUpdatedCookieHeader(mergeCookieHeader(cookieHeader, setCookies));
          }
          if (isDebug) {
            console.debug('[middleware] session restored via refresh token');
          }
        } else {
          applyUpdatedCookieHeader(removeAuthCookies(cookieHeader));
          if (isDebug) {
            console.debug('[middleware] session empty, clearing auth cookies');
          }
        }
      } else {
        applyUpdatedCookieHeader(removeAuthCookies(cookieHeader));
        if (isDebug) {
          console.debug('[middleware] session refresh failed, clearing auth cookies');
        }
      }
    } catch (error) {
      applyUpdatedCookieHeader(removeAuthCookies(cookieHeader));
      if (isDebug) {
        console.debug('[middleware] session refresh threw error, clearing auth cookies', error);
      }
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
    return redirectResponse;
  }

  if (hasAccessToken && isAuthPage(pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/profile';
    const redirectResponse = NextResponse.redirect(destination);
    responseCookies.forEach((cookie) => redirectResponse.headers.append('set-cookie', cookie));
    redirectResponse.headers.set('x-middleware-cache', 'no-cache');
    return redirectResponse;
  }

  const response = NextResponse.next({
    request: cookieHeader !== request.headers.get('cookie') ? { headers: requestHeaders } : undefined,
  });
  responseCookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
  response.headers.set('x-middleware-cache', 'no-cache');
  return response;
}

export const config = {
  matcher: ['/profile/:path*', '/notes/:path*', '/sign-in', '/sign-up'],
};