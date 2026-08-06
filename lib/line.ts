import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

const LINE_JWKS_URL = new URL("https://api.line.me/oauth2/v2.1/certs");
const LINE_ISSUER = "https://access.line.me";

// jose will fetch and cache the LINE public keys automatically.
const jwks = createRemoteJWKSet(LINE_JWKS_URL);

export interface LineIdTokenClaims {
  /** LINE user id (unique per LINE channel). */
  sub: string;
  /** Display name (may be undefined if not granted). */
  name?: string;
  /** Profile picture URL. */
  picture?: string;
  /** Email (only if the `email` scope was granted). */
  email?: string;
}

export class LineIdTokenError extends Error {}

/**
 * Verifies a LINE LIFF idToken on the server side.
 *
 * The client-side `liff.getDecodedIDToken()` result must NEVER be trusted.
 * It is only a base64-decoded header/payload — anyone can craft it. This
 * function cryptographically verifies the signature against LINE's public
 * keys and checks the issuer and audience claims.
 */
export async function verifyLineIdToken(
  idToken: string
): Promise<LineIdTokenClaims> {
  const channelId = process.env.LINE_CHANNEL_ID;

  if (!channelId) {
    throw new LineIdTokenError("LINE_CHANNEL_ID is not configured");
  }

  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: LINE_ISSUER,
      audience: channelId,
    });

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw new LineIdTokenError("idToken is missing the sub claim");
    }

    return {
      sub: payload.sub,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch (error) {
    if (error instanceof LineIdTokenError) {
      throw error;
    }
    throw new LineIdTokenError("idToken verification failed");
  }
}
