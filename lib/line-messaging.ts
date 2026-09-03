import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// ============================================================================
// LINE Messaging API helpers (the LINE OA / bot channel).
//
// The login (LIFF) channel and the Messaging API channel are two different
// LINE channels, BUT because they belong to the same provider a user has the
// SAME id on both — so `users.oa_user_id` is actually equal to the `sub` from
// the login idToken (`users.line_user_id`). This module touches server-only
// secrets and must never be imported from the browser bundle.
// ============================================================================

const PUSH_URL = "https://api.line.me/v2/bot/message/push";

export class LineMessagingError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "LineMessagingError";
  }
}

function getBotSecret(): string {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) {
    throw new LineMessagingError("LINE_CHANNEL_SECRET is not configured");
  }
  return secret;
}

function getBotAccessToken(): string {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new LineMessagingError("LINE_CHANNEL_ACCESS_TOKEN is not configured");
  }
  return token;
}

/**
 * Verifies the `X-Line-Signature` header on a webhook request using the LINE
 * Messaging API channel secret. Returns false for any mismatch so callers can
 * reject requests that are not really from LINE.
 */
export function verifyLineSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!rawBody || !signature) {
    return false;
  }

  const expected = createHmac("sha256", getBotSecret())
    .update(rawBody, "utf8")
    .digest("base64");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  // timingSafeEqual throws when the buffers differ in length — bail first.
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export interface LineSendMessage {
  type: "text";
  text: string;
}

/**
 * Sends a push message to a single Messaging API user id.
 * Fails with LineMessagingError when the recipient has not added the OA as
 * a friend (HTTP 400 from LINE is the usual cause).
 */
export async function sendPushMessage(
  to: string,
  messages: LineSendMessage[]
): Promise<void> {
  if (!to) {
    throw new LineMessagingError("Missing LINE recipient user id");
  }

  const res = await fetch(PUSH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getBotAccessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, messages }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new LineMessagingError(
      `LINE push failed: ${res.status} ${body}`,
      res.status
    );
  }
}

/** The public URL of this app's LIFF app; opening it inside LINE keeps login. */
export function getLineLiffUrl(): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) {
    throw new LineMessagingError("NEXT_PUBLIC_LIFF_ID is not configured");
  }
  return `https://liff.line.me/${liffId}`;
}

/**
 * Builds the push message that is sent when a phase finishes.
 * Kept pure (liffUrl passed in) so it is easy to unit test.
 */
export function buildPhaseEndMessages(
  phase: "fasting" | "eating",
  liffUrl: string
): LineSendMessage[] {
  if (phase === "fasting") {
    return [
      {
        type: "text",
        text:
          "⏰ หมดเวลาการอดแล้วค่าาา✨ \n" +
          "กดหยุดการอด แล้วเริ่มช่วงกินได้เลย:\n" +
          liffUrl,
      },
    ];
  }

  return [
    {
      type: "text",
      text:
        "⏰ หมดเวลาการกินแล้วค่าาา✨ \n" +
        "กดจบรอบนี้ แล้วเริ่มรอบอดถัดไปได้เลย:\n" +
        liffUrl,
    },
  ];
}

/**
 * Builds the "time to update your weight" reminder sent by the weight cron.
 * Kept pure so it is easy to unit test.
 */
export function buildWeightReminderMessages(
  liffUrl: string
): LineSendMessage[] {
  return [
    {
      type: "text",
      text:
        "⚖️ ครบ 7 วันแล้ว อย่าลืมอัปเดตน้ำหนักนะ 🎯\n" +
        "กดบันทึกน้ำหนักวันนี้ได้เลย:\n" +
        liffUrl,
    },
  ];
}