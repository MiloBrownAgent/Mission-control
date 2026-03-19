import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PORTAL_SECRET = new TextEncoder().encode(
  process.env.PORTAL_SESSION_SECRET ?? "dev-secret-change-me"
);

const MC_WORK_AUTH_COOKIE = "mc_work_auth";
const PORTAL_SESSION_COOKIE = "mc_portal_session";

// Public portal paths that don't require portal auth
const PORTAL_PUBLIC_PATHS = ["/portal/login"];

// MC API paths that are public (auth endpoint itself)
const MC_PUBLIC_API_PATHS = ["/api/portal/auth", "/api/portal/me"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Portal routes (/portal/*) ────────────────────────────────────────────
  if (pathname.startsWith("/portal")) {
    // Allow public portal paths (login page)
    const isPublicPortalPath = PORTAL_PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
    if (isPublicPortalPath) {
      return NextResponse.next();
    }

    // Allow portal auth API calls through without portal session check
    const isPublicApiPath = MC_PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));
    if (isPublicApiPath) {
      return NextResponse.next();
    }

    const portalToken = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;

    if (!portalToken) {
      return redirectToPortalLogin(request);
    }

    try {
      await jwtVerify(portalToken, PORTAL_SECRET);
      return NextResponse.next();
    } catch {
      return redirectToPortalLogin(request);
    }
  }

  // ── All other MC routes ─────────────────────────────────────────────────
  // Allow public paths
  const isPublicPath =
    pathname.startsWith("/api/auth") ||   // Dave's login API
    pathname === "/login" ||
    pathname === "/api/portal/auth" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public");

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check Dave's mc_work_auth cookie
  const workAuth = request.cookies.get(MC_WORK_AUTH_COOKIE)?.value;
  if (workAuth !== "authenticated") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

function redirectToPortalLogin(request: NextRequest) {
  const loginUrl = new URL("/portal/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
  ],
};
