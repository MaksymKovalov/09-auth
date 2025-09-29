import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { api } from '../../api';
import { isAxiosError } from 'axios';
import { clearAuthCookies, forwardSetCookies, logErrorResponse } from '../../_utils/utils';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    if (!cookieHeader) {
      return NextResponse.json(null, { status: 200 });
    }

    const apiRes = await api.get('auth/session', {
      headers: {
        Cookie: cookieHeader,
      },
    });

    const response = NextResponse.json(apiRes.data ?? null, { status: apiRes.status });
    forwardSetCookies(response, apiRes.headers['set-cookie']);
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
      return response;
    }
    logErrorResponse({ message: (error as Error).message });
    const response = NextResponse.json(null, { status: 200 });
    clearAuthCookies(response, req);
    return response;
  }
}
