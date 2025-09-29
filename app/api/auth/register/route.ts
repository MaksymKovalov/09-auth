import { NextRequest, NextResponse } from 'next/server';
import { api } from '../../api';
import { isAxiosError } from 'axios';
import { forwardSetCookies, logErrorResponse } from '../../_utils/utils';
import { debugCookies, isAuthDebugEnabled, logAuthDebug } from '@/lib/utils/authDebug';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiRes = await api.post('auth/register', body);
    const response = NextResponse.json(apiRes.data ?? null, { status: apiRes.status });
    const setCookieHeader = apiRes.headers['set-cookie'];
    forwardSetCookies(response, setCookieHeader);

    if (isAuthDebugEnabled) {
      logAuthDebug('api:register:success', {
        status: apiRes.status,
        setCookieCount: Array.isArray(setCookieHeader) ? setCookieHeader.length : setCookieHeader ? 1 : 0,
        cookies: debugCookies(response.headers.get('set-cookie') ?? undefined),
      });
    }
    return response;
  } catch (error) {
    if (isAxiosError(error)) {
      logErrorResponse(error.response?.data);
      if (isAuthDebugEnabled) {
        logAuthDebug('api:register:error', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      return NextResponse.json(
        error.response?.data ?? { message: error.message },
        { status: error.response?.status ?? 500 }
      );
    }
    logErrorResponse({ message: (error as Error).message });
    if (isAuthDebugEnabled) {
      logAuthDebug('api:register:error', {
        message: (error as Error).message,
      });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
