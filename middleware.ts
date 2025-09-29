import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { debugCookies, isAuthDebugEnabled, logAuthDebug } from '@/lib/utils/authDebug';

const PUBLIC_ONLY_ROUTES = ['/sign-in', '/sign-up'];
const PROTECTED_PREFIXES = ['/notes', '/profile'];

const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const isPublicOnlyPath = (pathname: string) => PUBLIC_ONLY_ROUTES.includes(pathname);

const buildRedirectValue = (request: NextRequest) => {
  const query = request.nextUrl.search;
  const suffix = query ? `${request.nextUrl.pathname}${query}` : request.nextUrl.pathname;
  return suffix.startsWith('/') ? suffix : `/${suffix}`;
};

const sanitizeRedirectTarget = (target: string | null) => {
  if (!target) return null;
  return target.startsWith('/') ? target : null;
};

const extractSetCookies = (headers: Headers): string[] => {
  if ('getSetCookie' in headers && typeof (headers as Headers & { getSetCookie(): string[] }).getSetCookie === 'function') {
    return (headers as Headers & { getSetCookie(): string[] }).getSetCookie();
  }

  const setCookieHeader = headers.get('set-cookie');
  return setCookieHeader ? [setCookieHeader] : [];
};

const appendCookies = (response: NextResponse, cookies: string[]) => {
  cookies.forEach((cookie) => {
    response.headers.append('set-cookie', cookie);
  });
};

const mergeCookieHeader = (existingCookie: string, refreshedCookies: string[]): string => {
  const cookieMap = new Map<string, string>();

  const registerCookie = (cookiePair: string) => {
    const [name, ...rest] = cookiePair.trim().split('=');
    if (name && rest.length) {
      cookieMap.set(name, rest.join('='));
    }
  };

  existingCookie
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .forEach(registerCookie);

  refreshedCookies.forEach((cookieStr) => {
    const [pair] = cookieStr.split(';');
    registerCookie(pair);
  });

  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);

  if (isAuthDebugEnabled) {
    logAuthDebug('middleware:start', {
      pathname,
      cookies: debugCookies(request.headers.get('cookie')),
    });
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next();
  }

  let hasAccessToken = request.cookies.has('accessToken');
  const hasRefreshToken = request.cookies.has('refreshToken');
  let refreshedCookies: string[] = [];
  let refreshedCookieHeader: string | null = null;

  if (!hasAccessToken && hasRefreshToken) {
    try {
      const sessionResponse = await fetch(new URL('/api/auth/session', request.url), {
        headers: {
          cookie: request.headers.get('cookie') ?? '',
        },
        cache: 'no-store',
      });

      if (isAuthDebugEnabled) {
        logAuthDebug('middleware:refresh-response', {
          status: sessionResponse.status,
          ok: sessionResponse.ok,
          setCookie: sessionResponse.headers.get('set-cookie')?.split('\n').length ?? 0,
        });
      }

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json().catch(() => null);
        if (sessionData) {
          hasAccessToken = true;
        }
        refreshedCookies = extractSetCookies(sessionResponse.headers);
      }
    } catch {
      // Ignore refresh errors and proceed with existing cookies
      if (isAuthDebugEnabled) {
        logAuthDebug('middleware:refresh-error', {
          message: 'session fetch failed',
        });
      }
    }

    if (refreshedCookies.length) {
      const existingCookieHeader = request.headers.get('cookie') ?? '';
      refreshedCookieHeader = mergeCookieHeader(existingCookieHeader, refreshedCookies);
      if (refreshedCookieHeader) {
        requestHeaders.set('cookie', refreshedCookieHeader);
      }
      if (isAuthDebugEnabled) {
        logAuthDebug('middleware:merged-cookies', {
          merged: debugCookies(refreshedCookieHeader),
        });
      }
    }
  }

  if (!hasAccessToken && isProtectedPath(pathname)) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = '/sign-in';
    signInUrl.searchParams.set('redirect', buildRedirectValue(request));
    const redirectResponse = NextResponse.redirect(signInUrl);
    appendCookies(redirectResponse, refreshedCookies);
    if (isAuthDebugEnabled) {
      logAuthDebug('middleware:redirect-sign-in', {
        pathname,
        hasRefreshToken,
        refreshedCount: refreshedCookies.length,
      });
    }
    return redirectResponse;
  }

  if (hasAccessToken && isPublicOnlyPath(pathname)) {
    const redirectParam = sanitizeRedirectTarget(request.nextUrl.searchParams.get('redirect'));
    const destination = redirectParam ?? '/profile';
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
    appendCookies(redirectResponse, refreshedCookies);
    if (isAuthDebugEnabled) {
      logAuthDebug('middleware:redirect-private', {
        pathname,
        destination,
        refreshedCount: refreshedCookies.length,
      });
    }
    return redirectResponse;
  }

  const response = NextResponse.next({
    request: refreshedCookieHeader ? { headers: requestHeaders } : undefined,
  });
  appendCookies(response, refreshedCookies);
  if (isAuthDebugEnabled) {
    logAuthDebug('middleware:allow', {
      pathname,
      hasAccessToken,
      hasRefreshToken,
      forwardedCookie: refreshedCookieHeader
        ? debugCookies(refreshedCookieHeader)
        : debugCookies(request.headers.get('cookie')),
      refreshedCount: refreshedCookies.length,
    });
  }
  return response;
}

export const config = {
  matcher: ['/profile/:path*', '/notes/:path*', '/sign-in', '/sign-up'],
};
