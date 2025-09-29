import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { parse } from 'cookie';
import { debugCookies, logAuthDebug } from '../../../lib/utils/authDebug';

const resolveIsSecure = (request: NextRequest) => {
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol;
  return proto === 'https' || proto === 'https:';
};

const resolveSameSite = (): 'lax' | 'strict' | 'none' => 'lax';

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

const resolveCookieDomain = (_request: NextRequest, useSecure: boolean) => {
  if (!useSecure) {
    return undefined;
  }

  const envDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (!envDomain) {
    return undefined;
  }

  return envDomain;
};

export const storeAuthCookies = async (
  request: NextRequest,
  setCookieHeader: string | string[] | undefined,
): Promise<CookiePayload[]> => {
  if (!setCookieHeader) {
    logAuthDebug('cookies:store-skipped', { reason: 'no-set-cookie' });
    return [];
  }

  const cookieArray = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const result: CookiePayload[] = [];

  cookieArray.forEach((cookieStr) => {
    const parsed = parse(cookieStr) as Record<string, string | undefined>;
    const secure = resolveIsSecure(request);
    const baseOptions = buildCookieOptions(request, parsed);
    const useSecure = secure;
    const domain = resolveCookieDomain(request, useSecure);
    const options = {
      ...baseOptions,
      secure: useSecure,
      sameSite: resolveSameSite(),
      ...(domain ? { domain } : {}),
    } satisfies CookieOptions;

    if (parsed.accessToken) {
      result.push({ name: 'accessToken', value: parsed.accessToken, options });
      logAuthDebug('cookies:parsed', {
        name: 'accessToken',
        options,
      });
    }

    if (parsed.refreshToken) {
      result.push({ name: 'refreshToken', value: parsed.refreshToken, options });
      logAuthDebug('cookies:parsed', {
        name: 'refreshToken',
        options,
      });
    }
  });

  return result;
};

export const clearAuthCookies = async (response: NextResponse, request: NextRequest) => {
  const cookieStore = await cookies();
  const secure = resolveIsSecure(request);
  const useSecure = process.env.NODE_ENV === 'production' ? secure : false;
  const sameSite = resolveSameSite();
  const domain = resolveCookieDomain(request, useSecure);
  logAuthDebug('cookies:clear-start', {
    incoming: debugCookies(cookieStore.toString()),
    useSecure,
    sameSite,
    domain,
  });
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
  logAuthDebug('cookies:clear-sent', {
    domain,
  });
};

export const logErrorResponse = (errorObj: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[api:error]', errorObj);
  }
};
