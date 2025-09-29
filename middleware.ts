import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Пропускаємо всі технічні маршрути
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path === '/favicon.ico' ||
    path === '/'
  ) {
    return NextResponse.next();
  }

  // Отримуємо cookies
  const cookies = request.cookies;
  const accessToken = cookies.get('accessToken');
  const refreshToken = cookies.get('refreshToken');

  // Користувач авторизований якщо є хоча б один токен
  const isAuthenticated = !!(accessToken || refreshToken);

  // Визначаємо тип маршруту
  const isAuthPage = path === '/sign-in' || path === '/sign-up';
  const isProtectedPage = path.startsWith('/profile') || path.startsWith('/notes');

  // Редиректи
  if (!isAuthenticated && isProtectedPage) {
    // Неавторизований на захищеній сторінці -> на логін
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && isAuthPage) {
    // Авторизований на сторінці логіну/реєстрації -> на профіль
    const url = request.nextUrl.clone();
    url.pathname = '/profile';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Конфігурація для Vercel
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next (Next.js internals)
     * - fonts, images, etc.
     */
    '/((?!api|_next|.*\\..*|favicon.ico).*)',
  ],
};