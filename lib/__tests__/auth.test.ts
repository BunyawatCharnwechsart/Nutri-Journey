import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

import { createSessionToken, verifySessionToken } from "@/lib/auth";

const VALID_SECRET = "a-very-long-secret-that-is-at-least-32-chars";

/**
 * Signs a token with the SAME secret but attacker-chosen claims, so we can
 * prove verification rejects anything that is not a genuine session token.
 */
function signWithCustomClaims(overrides: {
  sub?: string;
  issuer?: string;
  audience?: string;
  expiresIn?: string;
}): Promise<string> {
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(overrides.sub ?? "user-123")
    .setIssuer(overrides.issuer ?? "nutrijourney")
    .setAudience(overrides.audience ?? "nutrijourney-app")
    .setIssuedAt()
    .setExpirationTime(overrides.expiresIn ?? "7d")
    .sign(secret);
}

describe("session JWT", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", VALID_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a signed token back to the userId", async () => {
    const token = await createSessionToken("user-123");
    const payload = await verifySessionToken(token);
    expect(payload?.sub).toBe("user-123");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken("user-123");

    vi.stubEnv("SESSION_SECRET", "another-long-secret-that-is-also-32-chars");
    const payload = await verifySessionToken(token);
    expect(payload).toBeNull();
  });

  it("rejects a malformed token", async () => {
    const payload = await verifySessionToken("not.a.jwt");
    expect(payload).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signWithCustomClaims({ expiresIn: "-1h" });
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects a token with the wrong issuer", async () => {
    const token = await signWithCustomClaims({ issuer: "evil-issuer" });
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects a token with the wrong audience", async () => {
    const token = await signWithCustomClaims({ audience: "other-app" });
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("throws when SESSION_SECRET is missing or too short", async () => {
    vi.stubEnv("SESSION_SECRET", ""); // missing / empty
    await expect(createSessionToken("user-123")).rejects.toThrow();

    vi.stubEnv("SESSION_SECRET", "short"); // too short (< 32 chars)
    await expect(createSessionToken("user-123")).rejects.toThrow();
  });
});