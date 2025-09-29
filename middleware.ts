import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ResponseCookies, RequestCookies } from 'next/dist/server/web/spec-extension/cookies';

// Функція для копіювання кукі з response в request
function applySetCookie(req: NextRequest, res: NextResponse): void {
  // Парсимо кукі з response
  const setCookies = new ResponseCookies(res.headers);

  // Створюємо нові заголовки для request з оновленими кукі
  const newReqHeaders = new Headers(req.headers);
  const newReqCookies = new RequestCookies(newReqHeaders);

  // Копіюємо всі кукі з response в request
  setCookies.getAll().forEach((cookie) => {
    newReqCookies.set(cookie);
  });

  // Створюємо dummy response з оновленими заголовками
  const dummyRes = NextResponse.next({
    request: {
      headers: newReqHeaders,
    },
  });

  // Оновлюємо заголовки оригінального response
  dummyRes.headers.forEach((value, key) => {
    if (key === 'x-middleware-override-headers' || key.startsWith('x-middleware-request-')) {
      res.headers.set(key, value);
    }
  });
}

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

  // Логування для діагностики на Vercel
  if (process.env.NODE_ENV === 'production') {
    console.log('Middleware:', {
      path,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      cookieHeader: request.headers.get('cookie'),
    });
  }

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

  // Застосовуємо кукі з response до request для Vercel
  applySetCookie(request, response);
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