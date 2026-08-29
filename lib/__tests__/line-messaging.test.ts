import { createHmac } from "node:crypto";
import { describe, expect, it, beforeEach } from "vitest";

import {
  buildPhaseEndMessages,
  verifyLineSignature,
} from "@/lib/line-messaging";

const SECRET = "test-channel-secret-for-signature-unit-tests";
const LIFF_URL = "https://liff.line.me/2010969375-00gWlcz6";

function sign(rawBody: string): string {
  return createHmac("sha256", SECRET).update(rawBody, "utf8").digest("base64");
}

describe("verifyLineSignature", () => {
  beforeEach(() => {
    process.env.LINE_CHANNEL_SECRET = SECRET;
  });

  it("accepts a valid signature", () => {
    const rawBody = JSON.stringify({ events: [] });
    expect(verifyLineSignature(rawBody, sign(rawBody))).toBe(true);
  });

  it("rejects a tampered body", () => {
    const validSignature = sign('{"events":[]}');
    expect(verifyLineSignature('{"events":[]} ' , validSignature)).toBe(false);
  });

  it("rejects mismatched length / missing signature", () => {
    const rawBody = JSON.stringify({ events: [] });
    expect(verifyLineSignature(rawBody, "too-short")).toBe(false);
    expect(verifyLineSignature(rawBody, null)).toBe(false);
    expect(verifyLineSignature("", sign(rawBody))).toBe(false);
  });
});

describe("buildPhaseEndMessages", () => {
  it("builds the fasting end message with the app link", () => {
    const [message] = buildPhaseEndMessages("fasting", LIFF_URL);
    expect(message.type).toBe("text");
    expect(message.text).toContain("หมดอด");
    expect(message.text).toContain(LIFF_URL);
  });

  it("builds the eating end message with the app link", () => {
    const [message] = buildPhaseEndMessages("eating", LIFF_URL);
    expect(message.type).toBe("text");
    expect(message.text).toContain("หมดเวลากิน");
    expect(message.text).toContain(LIFF_URL);
  });
});