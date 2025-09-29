import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';

const resolveIsSecure = (request: NextRequest) => {
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol;
  return proto === 'https' || proto === 'https:';
};

export const storeAuthCookies = async (
  request: NextRequest,
  setCookieHeader: string | string[] | undefined,
): Promise<boolean> => {
  if (!setCookieHeader) {
    return false;
  }

  const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const cookieStore = await cookies();
  const secure = resolveIsSecure(request);

  let stored = false;

  cookieArray.forEach((cookieStr) => {
    const parsed = parse(cookieStr);
    const options = {
      path: parsed.Path ?? '/',
      expires: parsed.Expires ? new Date(parsed.Expires) : undefined,
      maxAge: parsed['Max-Age'] ? Number(parsed['Max-Age']) : undefined,
      httpOnly: true as const,
      sameSite: 'none' as const,
      secure,
    };

    if (parsed.accessToken) {
      cookieStore.set('accessToken', parsed.accessToken, options);
      stored = true;
    }

    if (parsed.refreshToken) {
      cookieStore.set('refreshToken', parsed.refreshToken, options);
      stored = true;
    }
  });

  return stored;
};

export const clearAuthCookies = async (response: NextResponse, request: NextRequest) => {
  const cookieStore = await cookies();
  const secure = resolveIsSecure(request);
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');

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
};

export const logErrorResponse = (errorObj: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[api:error]', errorObj);
  }
};
