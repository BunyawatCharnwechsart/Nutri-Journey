import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import { apiError } from "@/lib/response";

export const SESSION_COOKIE_NAME = "nj_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_ISSUER = "nutrijourney";
const SESSION_AUDIENCE = "nutrijourney-app";

export interface SessionPayload {
  /** Our internal user id (users.user_id UUID). */
  sub: string;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }

  return new TextEncoder().encode(secret);
}

/** Signs our own session JWT (HS256). Expires after 7 days. */
export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());
}

/**
 * Verifies a session JWT. Returns the payload, or null if the token is
 * missing, malformed, expired or signed with the wrong secret.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });

    if (typeof payload.sub !== "string") {
      return null;
    }

    return { sub: payload.sub };
  } catch {
    return null;
  }
}

/** Reads and verifies the session cookie. Returns userId or null. */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);
  return payload?.sub ?? null;
}

/**
 * Auth guard for protected route handlers.
 *
 * Returns `{ userId }` when the request has a valid session cookie,
 * otherwise returns `{ response }` (a 401 JSON response) that the caller
 * should return immediately.
 */
export async function requireAuth(): Promise<
  | { userId: string; response?: never }
  | { userId?: never; response: Response }
> {
  const userId = await getSessionUserId();

  if (!userId) {
    return {
      response: apiError("Authentication required", 401, "UNAUTHORIZED"),
    };
  }

  return { userId };
}
