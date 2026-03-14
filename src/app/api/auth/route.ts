import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password: rawPassword, redirect: redirectPath } = await request.json();
  const password = rawPassword?.trim();

  const workPassword = process.env.WORK_PASSWORD?.trim();

  if (!workPassword || password !== workPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, redirect: redirectPath || '/' });
  response.cookies.set('mc_work_auth', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
}
