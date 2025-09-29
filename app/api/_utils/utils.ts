import type { NextRequest, NextResponse } from 'next/server';

export function forwardSetCookies(
  response: NextResponse,
  setCookieHeader: string | string[] | undefined,
): void {
  if (!setCookieHeader) {
    return;
  }

  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

  cookies.forEach((cookie) => {
    response.headers.append('set-cookie', cookie);
  });
}

const resolveIsSecure = (request: NextRequest) => {
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol;
  return proto === 'https' || request.nextUrl.protocol === 'https:';
};

export function clearAuthCookies(response: NextResponse, request: NextRequest): void {
  const secure = resolveIsSecure(request);

  response.cookies.set('accessToken', '', {
    path: '/',
    httpOnly: true,
    sameSite: 'none',
    secure,
    maxAge: 0,
  });

  response.cookies.set('refreshToken', '', {
    path: '/',
    httpOnly: true,
    sameSite: 'none',
    secure,
    maxAge: 0,
  });
}

export function logErrorResponse(errorObj: unknown): void {
  const green = '\x1b[32m';
  const yellow = '\x1b[33m';
  const reset = '\x1b[0m';

  console.log(`${green}> ${yellow}Error Response Data:${reset}`);
  console.dir(errorObj, { depth: null, colors: true });
}
