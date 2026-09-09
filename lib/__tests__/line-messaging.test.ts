import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  LineMessagingError,
  buildMeasurementReminderMessages,
  buildPhaseEndMessages,
  buildWeightReminderMessages,
  verifyLineSignature,
} from "@/lib/line-messaging";

const SECRET = "test-channel-secret-for-signature-unit-tests";
const LIFF_URL = "https://liff.line.me/2010969375-00gWlcz6";

function sign(rawBody: string): string {
  return createHmac("sha256", SECRET).update(rawBody, "utf8").digest("base64");
}

describe("verifyLineSignature", () => {
  beforeEach(() => {
    vi.stubEnv("LINE_CHANNEL_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("throws when LINE_CHANNEL_SECRET is not configured", () => {
    vi.stubEnv("LINE_CHANNEL_SECRET", "");
    expect(() => verifyLineSignature("{}", "x")).toThrow(LineMessagingError);
  });
});

describe("buildPhaseEndMessages", () => {
  it("builds the fasting end message with the app link", () => {
    const [message] = buildPhaseEndMessages("fasting", LIFF_URL);
    expect(message.type).toBe("text");
    expect(message.text).toContain("หมดเวลาการอดแล้ว");
    expect(message.text).toContain(LIFF_URL);
  });

  it("builds the eating end message with the app link", () => {
    const [message] = buildPhaseEndMessages("eating", LIFF_URL);
    expect(message.type).toBe("text");
    expect(message.text).toContain("หมดเวลาการกินแล้ว");
    expect(message.text).toContain(LIFF_URL);
  });

  it("prepends userName when provided for fasting", () => {
    const [message] = buildPhaseEndMessages("fasting", LIFF_URL, "นนท์");
    expect(message.text).toMatch(/^นนท์ /);
    expect(message.text).toContain("หมดเวลาการอดแล้ว");
  });

  it("prepends userName when provided for eating", () => {
    const [message] = buildPhaseEndMessages("eating", LIFF_URL, "นนท์");
    expect(message.text).toMatch(/^นนท์ /);
    expect(message.text).toContain("หมดเวลาการกินแล้ว");
  });

  it("omits userName prefix when null", () => {
    const [message] = buildPhaseEndMessages("fasting", LIFF_URL, null);
    expect(message.text.startsWith("⏰")).toBe(true);
  });

  it("omits userName prefix when undefined (not passed)", () => {
    const [message] = buildPhaseEndMessages("fasting", LIFF_URL);
    expect(message.text.startsWith("⏰")).toBe(true);
  });

  it("omits userName prefix for whitespace-only and empty names", () => {
    expect(buildPhaseEndMessages("fasting", LIFF_URL, "   ")[0].text.startsWith("⏰")).toBe(true);
    expect(buildPhaseEndMessages("fasting", LIFF_URL, "")[0].text.startsWith("⏰")).toBe(true);
  });

  it("trims surrounding whitespace from userName", () => {
    const [message] = buildPhaseEndMessages("fasting", LIFF_URL, "  นนท์  ");
    expect(message.text).toMatch(/^นนท์ /);
  });

  it("handles a very long userName within LINE 2000-char limit", () => {
    const longName = "น".repeat(500);
    const [message] = buildPhaseEndMessages("fasting", LIFF_URL, longName);
    expect(message.text.length).toBeLessThanOrEqual(2000);
    expect(message.text).toMatch(/^น{500} /);
  });

  it("builds the weight update reminder with the app link", () => {
    const [message] = buildWeightReminderMessages(LIFF_URL);
    expect(message.type).toBe("text");
    expect(message.text).toContain("อัปเดตน้ำหนัก");
    expect(message.text).toContain(LIFF_URL);
  });

  it("prepends userName when provided for weight reminder", () => {
    const [message] = buildWeightReminderMessages(LIFF_URL, "นนท์");
    expect(message.text).toMatch(/^นนท์ /);
    expect(message.text).toContain("อัปเดตน้ำหนัก");
  });

  it("builds the measurement update reminder with the app link", () => {
    const [message] = buildMeasurementReminderMessages(LIFF_URL);
    expect(message.type).toBe("text");
    expect(message.text).toContain("อัปเดตสัดส่วน");
    expect(message.text).toContain(LIFF_URL);
  });

  it("prepends userName when provided for measurement reminder", () => {
    const [message] = buildMeasurementReminderMessages(LIFF_URL, "นนท์");
    expect(message.text).toMatch(/^นนท์ /);
    expect(message.text).toContain("อัปเดตสัดส่วน");
  });
});