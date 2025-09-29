import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_PAGES = ['/sign-in', '/sign-up'];
const PROTECTED_PREFIXES = ['/profile', '/notes'];

const isAuthPage = (pathname: string) => AUTH_PAGES.includes(pathname);
const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;

  if (accessToken && isAuthPage(pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = '/profile';
    return NextResponse.redirect(destination);
  }

  if (!accessToken && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/sign-in';
    const targetPath = `${pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set('redirect', targetPath);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/:path*', '/notes/:path*', '/sign-in', '/sign-up'],
};
