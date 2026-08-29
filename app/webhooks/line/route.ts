import { createServiceClient } from "@/lib/supabase/service";
import { verifyLineSignature } from "@/lib/line-messaging";
import { consumeLinkCode, parseLinkCode } from "@/lib/line-link";

export const runtime = "nodejs";

// ============================================================================
// POST /webhooks/line
//
// Endpoint that the LINE Messaging API (channel 2011317842) calls when events
// happen in the OA chat. Currently it only cares about one pattern: the user
// sends a "[NJ-LINK] <code>" text message (via liff.sendMessages inside the
// app) which binds their OA userId to their app account.
//
// Security: every request must carry a valid X-Line-Signature (HMAC-SHA256
// with the channel secret) or it is rejected. This endpoint is NOT under
// /api, so the proxy.ts rate limiter does not apply to it. It always answers
// 200 so LINE does not retry events we processed or cannot process.
// ============================================================================

interface LineWebhookEvent {
  type?: string;
  message?: { type?: string; text?: string };
  source?: { userId?: string };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return Response.json({ success: false }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as { events?: LineWebhookEvent[] };
    const events = payload.events ?? [];

    const supabase = createServiceClient();

    for (const event of events) {
      if (event.type !== "message") {
        continue;
      }
      if (event.message?.type !== "text") {
        continue;
      }

      const oaUserId = event.source?.userId;
      const code = parseLinkCode(event.message.text ?? "");
      if (!oaUserId || !code) {
        continue;
      }

      await consumeLinkCode(supabase, code, oaUserId);
    }
  } catch (error) {
    // Keep the wire protocol healthy: LINE never sees a 5xx for events we
    // fail to handle. The failure is logged instead.
    console.error("[LINE webhook] processing failed", error);
  }

  return Response.json({ success: true });
}