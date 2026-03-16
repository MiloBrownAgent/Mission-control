import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/favicon', '/api/manifest', '/api/dropbox', '/api/whoop', '/api/investments/generate-thesis', '/api/cre/generate-memo', '/privacy', '/_next', '/favicon.ico', '/manifest.json', '/icons'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for public paths and static assets
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname.includes('.')) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  }

  const authCookie = request.cookies.get('mc_work_auth');

  if (authCookie?.value === 'authenticated') {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return response;
  }

  // Redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  const redirectResponse = NextResponse.redirect(loginUrl);
  redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return redirectResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
