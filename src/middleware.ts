import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth', '/_next', '/favicon.ico', '/manifest.json', '/icons'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') ?? '';

  // Skip auth for public paths and static assets
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname.includes('.')) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  }

  // Determine mode from host
  const isFamilyMode = host.includes('home.lookandseen.com') || host.includes('family');
  const cookieName = isFamilyMode ? 'mc_family_auth' : 'mc_work_auth';
  const authCookie = request.cookies.get(cookieName);

  if (authCookie?.value === 'authenticated') {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  }

  // Redirect to login with mode param
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('mode', isFamilyMode ? 'family' : 'work');
  loginUrl.searchParams.set('redirect', pathname);
  const redirectResponse = NextResponse.redirect(loginUrl);
  redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return redirectResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
