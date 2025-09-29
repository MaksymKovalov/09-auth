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
    const response = NextResponse.next();
    // Вимикаємо кешування middleware для Vercel
    response.headers.set('x-middleware-cache', 'no-cache');
    return response;
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
    const redirectResponse = NextResponse.redirect(url);
    // Вимикаємо кешування middleware для Vercel
    redirectResponse.headers.set('x-middleware-cache', 'no-cache');
    return redirectResponse;
  }

  if (isAuthenticated && isAuthPage) {
    // Авторизований на сторінці логіну/реєстрації -> на профіль
    const url = request.nextUrl.clone();
    url.pathname = '/profile';
    const redirectResponse = NextResponse.redirect(url);
    // Вимикаємо кешування middleware для Vercel
    redirectResponse.headers.set('x-middleware-cache', 'no-cache');
    return redirectResponse;
  }

  const response = NextResponse.next();
  // Вимикаємо кешування middleware для Vercel
  response.headers.set('x-middleware-cache', 'no-cache');
  return response;
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