import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { api } from '../../api';
import { isAxiosError } from 'axios';
import { clearAuthCookies, forwardSetCookies, logErrorResponse } from '../../_utils/utils';
import { debugCookies, isAuthDebugEnabled, logAuthDebug } from '@/lib/utils/authDebug';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    if (isAuthDebugEnabled) {
      logAuthDebug('api:session:start', {
        cookies: debugCookies(cookieHeader),
      });
    }

    if (!cookieHeader) {
      return NextResponse.json(null, { status: 200 });
    }

    const apiRes = await api.get('auth/session', {
      headers: {
        Cookie: cookieHeader,
      },
    });

    const response = NextResponse.json(apiRes.data ?? null, { status: apiRes.status });
    const setCookieHeader = apiRes.headers['set-cookie'];
    forwardSetCookies(response, setCookieHeader);
    if (isAuthDebugEnabled) {
      logAuthDebug('api:session:success', {
        status: apiRes.status,
        setCookieCount: Array.isArray(setCookieHeader) ? setCookieHeader.length : setCookieHeader ? 1 : 0,
        responseCookies: debugCookies(response.headers.get('set-cookie') ?? undefined),
      });
    }
    return response;
  } catch (error) {
    if (isAxiosError(error)) {
      logErrorResponse(error.response?.data);
      const status = error.response?.status ?? 200;
      const response = NextResponse.json(null, { status });
      if ((status ?? 500) >= 400) {
        clearAuthCookies(response, req);
      }
      forwardSetCookies(response, error.response?.headers?.['set-cookie']);
      if (isAuthDebugEnabled) {
        logAuthDebug('api:session:axios-error', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      return response;
    }
    logErrorResponse({ message: (error as Error).message });
    const response = NextResponse.json(null, { status: 200 });
    clearAuthCookies(response, req);
    if (isAuthDebugEnabled) {
      logAuthDebug('api:session:error', {
        message: (error as Error).message,
      });
    }
    return response;
  }
}
