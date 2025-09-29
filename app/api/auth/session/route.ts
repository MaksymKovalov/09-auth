import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { api } from '../../api';
import { isAxiosError } from 'axios';
import { clearAuthCookies, storeAuthCookies } from '../../_utils/utils';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    if (!cookieHeader) {
      return NextResponse.json(null, { status: 200 });
    }

  const apiRes = await api.get('/auth/session', {
      headers: {
        Cookie: cookieHeader,
      },
    });

    const cookiesToSet = await storeAuthCookies(req, apiRes.headers['set-cookie']);
    const response = NextResponse.json(apiRes.data ?? null, { status: apiRes.status });
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  } catch (error) {
    if (isAxiosError(error)) {
      const upstreamStatus = error.response?.status ?? 200;
      const isAuthError = upstreamStatus >= 400 && upstreamStatus < 500;
      const responseStatus = isAuthError ? 200 : upstreamStatus;
      const response = NextResponse.json(null, { status: responseStatus });
      if (isAuthError || upstreamStatus >= 500) {
        await clearAuthCookies(response, req);
      }
      return response;
    }
    const response = NextResponse.json(null, { status: 200 });
    await clearAuthCookies(response, req);
    return response;
  }
}
