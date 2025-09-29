import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
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

  // Check for auth tokens
  const hasAccessToken = request.cookies.has('accessToken');
  const hasRefreshToken = request.cookies.has('refreshToken');

  // Define route types
  const isAuthRoute = pathname === '/sign-in' || pathname === '/sign-up';
  const isProtectedRoute = pathname.startsWith('/profile') || pathname.startsWith('/notes');

  console.log('Middleware:', {
    pathname,
    hasAccessToken,
    hasRefreshToken,
    isAuthRoute,
    isProtectedRoute
  });

  // If user has valid token and tries to access auth pages, redirect to profile
  if (hasAccessToken && isAuthRoute) {
    console.log('Redirecting authenticated user from auth page to /profile');
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  // If user doesn't have token and tries to access protected pages, redirect to sign-in
  if (!hasAccessToken && !hasRefreshToken && isProtectedRoute) {
    console.log('Redirecting unauthenticated user to /sign-in');
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If user has only refresh token, try to refresh session
  if (!hasAccessToken && hasRefreshToken && isProtectedRoute) {
    try {
      const sessionUrl = new URL('/api/auth/session', request.url);
      const response = await fetch(sessionUrl, {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.success) {
          console.log('Session refreshed successfully');
          // Continue with the request
          return NextResponse.next();
        }
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }

    // If refresh failed, redirect to sign-in
    console.log('Session refresh failed, redirecting to /sign-in');
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Allow the request to continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};