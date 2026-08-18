import { beforeEach, describe, expect, it } from "vitest";

import { createSessionToken, verifySessionToken } from "@/lib/auth";

const VALID_SECRET = "a-very-long-secret-that-is-at-least-32-chars";

describe("session JWT", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = VALID_SECRET;
  });

  it("round-trips a signed token back to the userId", async () => {
    const token = await createSessionToken("user-123");
    const payload = await verifySessionToken(token);
    expect(payload?.sub).toBe("user-123");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken("user-123");

    process.env.SESSION_SECRET = "another-long-secret-that-is-also-32-chars";
    const payload = await verifySessionToken(token);
    expect(payload).toBeNull();
  });

  it("rejects a malformed token", async () => {
    const payload = await verifySessionToken("not.a.jwt");
    expect(payload).toBeNull();
  });

  it("throws when SESSION_SECRET is missing or too short", async () => {
    delete process.env.SESSION_SECRET;
    await expect(createSessionToken("user-123")).rejects.toThrow();
  });
});