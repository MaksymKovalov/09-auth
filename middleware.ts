import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;

  const publicOnlyRoutes = ['/sign-in', '/sign-up'];
  const protectedRoutes = ['/profile', '/notes'];

  const isPublicOnlyRoute = publicOnlyRoutes.includes(pathname);
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // If not a special route, allow access
  if (!isPublicOnlyRoute && !isProtectedRoute) {
    return NextResponse.next();
  }

  // Check if user has valid session
  const hasValidSession = !!accessToken;

  // Redirect authenticated users away from auth pages
  if (hasValidSession && isPublicOnlyRoute) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  // Redirect unauthenticated users to sign-in from protected pages
  if (!hasValidSession && isProtectedRoute) {
    // If user has refresh token, try to refresh session
    if (refreshToken) {
      try {
        const sessionRes = await fetch(new URL('/api/auth/session', request.url), {
          method: 'GET',
          headers: {
            'Cookie': `refreshToken=${refreshToken}`,
          },
        });

        // If session refresh successful, continue
        if (sessionRes.ok) {
          const data = await sessionRes.json();
          if (data && data.email) {
            // Session refreshed, allow access
            const response = NextResponse.next();

            // Copy new cookies from session response
            const setCookieHeader = sessionRes.headers.get('set-cookie');
            if (setCookieHeader) {
              response.headers.set('set-cookie', setCookieHeader);
            }

            return response;
          }
        }
      } catch (error) {
        console.error('Session refresh failed:', error);
      }
    }

    // No valid session, redirect to sign-in
    const url = new URL('/sign-in', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/sign-in',
    '/sign-up',
    '/profile/:path*',
    '/notes/:path*',
  ],
};