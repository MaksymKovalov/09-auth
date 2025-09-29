import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Пропускаємо API routes та статичні файли
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Перевіряємо токени у cookies
  const accessToken = request.cookies.get('accessToken');
  const refreshToken = request.cookies.get('refreshToken');

  // Визначаємо чи користувач авторизований
  const isAuthenticated = !!accessToken || !!refreshToken;

  // Публічні сторінки (тільки для неавторизованих)
  const publicOnlyRoutes = ['/sign-in', '/sign-up'];
  const isPublicOnlyRoute = publicOnlyRoutes.includes(pathname);

  // Приватні маршрути (тільки для авторизованих)
  const privateRoutes = ['/profile', '/notes'];
  const isPrivateRoute = privateRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Якщо неавторизований користувач намагається відкрити приватну сторінку → редирект на /sign-in
  if (!isAuthenticated && isPrivateRoute) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // Якщо авторизований користувач відкриває публічну сторінку → редирект на /profile
  if (isAuthenticated && isPublicOnlyRoute) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};