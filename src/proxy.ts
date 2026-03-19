import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ── Constants ─────────────────────────────────────────────────────────────────
const MC_WORK_AUTH_COOKIE    = 'mc_work_auth';
const PORTAL_SESSION_COOKIE  = 'mc_portal_session';

const PORTAL_SECRET = new TextEncoder().encode(
  process.env.PORTAL_SESSION_SECRET ?? 'dev-secret-change-me'
);

// MC public paths (no Dave auth required)
const MC_PUBLIC_PATHS = [
  '/login', '/api/auth', '/api/favicon', '/api/manifest',
  '/api/dropbox', '/api/whoop', '/api/investments/generate-thesis',
  '/api/investments/opportunity-thesis', '/api/cre/generate-memo',
  '/api/sentiment', '/privacy', '/_next', '/favicon.ico',
  '/manifest.json', '/icons',
];

// Portal public paths (no portal session required)
const PORTAL_PUBLIC_PATHS = ['/portal/login', '/api/portal/auth', '/api/portal/me'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function noIndex(response: ReturnType<typeof NextResponse.next | typeof NextResponse.redirect>) {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
}

function redirectToPortalLogin(request: NextRequest) {
  const url = new URL('/portal/login', request.url);
  url.searchParams.set('redirect', request.nextUrl.pathname);
  return noIndex(NextResponse.redirect(url));
}

// ── Main proxy ────────────────────────────────────────────────────────────────
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Portal routes (/portal/* + /api/portal/*) ────────────────────────────
  if (pathname.startsWith('/portal') || pathname.startsWith('/api/portal')) {
    // Public portal paths — no session needed
    if (PORTAL_PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
      return noIndex(NextResponse.next());
    }

    const token = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
    if (!token) return redirectToPortalLogin(request);

    try {
      await jwtVerify(token, PORTAL_SECRET);
      return noIndex(NextResponse.next());
    } catch {
      return redirectToPortalLogin(request);
    }
  }

  // ── All other MC routes — require Dave's work auth ───────────────────────
  if (MC_PUBLIC_PATHS.some(p => pathname.startsWith(p)) || pathname.includes('.')) {
    return noIndex(NextResponse.next());
  }

  const authCookie = request.cookies.get(MC_WORK_AUTH_COOKIE);
  if (authCookie?.value === 'authenticated') {
    return noIndex(NextResponse.next());
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return noIndex(NextResponse.redirect(loginUrl));
}
