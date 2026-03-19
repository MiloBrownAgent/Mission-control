import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.PORTAL_SESSION_SECRET ?? "dev-secret-change-me"
);

export const COOKIE_NAME = "mc_portal_session";
export const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface PortalSession {
  userId: string;
  email: string;
  clientSlug: string;
  name?: string;
}

export async function createSessionToken(payload: PortalSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<PortalSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as PortalSession;
  } catch {
    return null;
  }
}
