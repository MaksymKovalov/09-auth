import { NextRequest, NextResponse } from 'next/server';
import { api } from '../../api';
import { cookies } from 'next/headers';
import { isAxiosError } from 'axios';
import { clearAuthCookies } from '../../_utils/utils';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

  await api.post('/auth/logout', null, {
      headers: {
        Cookie: cookieHeader,
      },
    });

    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
    await clearAuthCookies(response, req);
    return response;
  } catch (error) {
    if (isAxiosError(error)) {
      return NextResponse.json(
        { error: error.message, response: error.response?.data },
        { status: error.status }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
