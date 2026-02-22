import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password: rawPassword, mode, redirect: redirectPath } = await request.json();
  const password = rawPassword?.trim();

  const familyPassword = process.env.FAMILY_PASSWORD?.trim();
  const workPassword = process.env.WORK_PASSWORD?.trim();

  const isFamilyMode = mode === 'family';
  const correctPassword = isFamilyMode ? familyPassword : workPassword;
  const cookieName = isFamilyMode ? 'mc_family_auth' : 'mc_work_auth';

  if (!correctPassword || password !== correctPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, redirect: redirectPath || '/' });
  response.cookies.set(cookieName, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
}
