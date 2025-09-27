import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  const hasAccessToken = request.cookies.has('accessToken');

  if (!hasAccessToken && isProtectedPath(pathname)) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = '/sign-in';
    signInUrl.searchParams.set('redirect', buildRedirectValue(request));
    return NextResponse.redirect(signInUrl);
  }

  if (hasAccessToken && isPublicOnlyPath(pathname)) {
    const redirectParam = sanitizeRedirectTarget(request.nextUrl.searchParams.get('redirect'));
    const destination = redirectParam ?? '/notes';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
