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

    const apiRes = await api.get('auth/session', {
      headers: {
        Cookie: cookieHeader,
      },
    });

    await storeAuthCookies(req, apiRes.headers['set-cookie']);
    return NextResponse.json(apiRes.data ?? null, { status: apiRes.status });
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status ?? 200;
      const response = NextResponse.json(null, { status });
      if ((status ?? 500) >= 400) {
        await clearAuthCookies(response, req);
      }
      return response;
    }
    const response = NextResponse.json(null, { status: 200 });
    await clearAuthCookies(response, req);
    return response;
  }
}
