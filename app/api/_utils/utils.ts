import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';

const resolveIsSecure = (request: NextRequest) => {
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol;
  return proto === 'https' || proto === 'https:';
};

const resolveSameSite = (secure: boolean): 'lax' | 'strict' | 'none' => (secure ? 'none' : 'lax');

type CookieOptions = {
  path?: string;
  expires?: Date;
  maxAge?: number;
  httpOnly?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
  domain?: string;
};

type CookiePayload = {
  name: 'accessToken' | 'refreshToken';
  value: string;
  options: CookieOptions;
};

const buildCookieOptions = (request: NextRequest, parsed: Record<string, string | undefined>): CookieOptions => ({
  path: '/',
  expires: parsed.Expires ? new Date(parsed.Expires) : undefined,
  maxAge: parsed['Max-Age'] ? Number(parsed['Max-Age']) : 7 * 24 * 60 * 60, // 7 days default
  httpOnly: true,
});

const resolveCookieDomain = (request: NextRequest, useSecure: boolean) => {
  if (!useSecure) {
    return undefined;
  }

  const envDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (envDomain) {
    return envDomain;
  }

  const hostname = request.nextUrl.hostname;

  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return undefined;
  }

  return hostname;
};

export const storeAuthCookies = async (
  request: NextRequest,
  setCookieHeader: string | string[] | undefined,
): Promise<CookiePayload[]> => {
  if (!setCookieHeader) {
    return [];
  }

  const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const cookieStore = await cookies();
  const result: CookiePayload[] = [];

  cookieArray.forEach((cookieStr) => {
    const parsed = parse(cookieStr) as Record<string, string | undefined>;
    const secure = resolveIsSecure(request);
    const baseOptions = buildCookieOptions(request, parsed);
    const useSecure = process.env.NODE_ENV === 'production' ? secure : false; // Умовне secure для production
    const domain = resolveCookieDomain(request, useSecure);
    const options = {
      ...baseOptions,
      secure: useSecure,
      sameSite: resolveSameSite(useSecure),
      ...(domain ? { domain } : {}),
    } satisfies CookieOptions;

    if (parsed.accessToken) {
      cookieStore.set('accessToken', parsed.accessToken, options);
      result.push({ name: 'accessToken', value: parsed.accessToken, options });
    }

    if (parsed.refreshToken) {
      cookieStore.set('refreshToken', parsed.refreshToken, options);
      result.push({ name: 'refreshToken', value: parsed.refreshToken, options });
    }
  });

  return result;
};

export const clearAuthCookies = async (response: NextResponse, request: NextRequest) => {
  const cookieStore = await cookies();
  const secure = resolveIsSecure(request);
  const useSecure = process.env.NODE_ENV === 'production' ? secure : false;
  const sameSite = resolveSameSite(useSecure);
  const domain = resolveCookieDomain(request, useSecure);
  cookieStore.delete('accessToken');
  cookieStore.delete('refreshToken');

  response.cookies.set('accessToken', '', {
    path: '/',
    httpOnly: true,
    sameSite,
    secure: useSecure,
    maxAge: 0,
    ...(domain ? { domain } : {}),
  });
  response.cookies.set('refreshToken', '', {
    path: '/',
    httpOnly: true,
    sameSite,
    secure: useSecure,
    maxAge: 0,
    ...(domain ? { domain } : {}),
  });
};

export const logErrorResponse = (errorObj: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[api:error]', errorObj);
  }
};
