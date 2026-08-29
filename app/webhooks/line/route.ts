import { createServiceClient } from "@/lib/supabase/service";
import { verifyLineSignature } from "@/lib/line-messaging";

export const runtime = "nodejs";

// ============================================================================
// POST /webhooks/line
//
// Endpoint that the LINE Messaging API (channel 2011317842) calls when events
// happen in the OA chat.
//
// LINE user ids are the same on every channel within one provider, so the
// `source.userId` here maps straight onto our `users.line_user_id`. We only
// need to keep the friendship state aligned with reality:
//
//   * follow (added as a friend)  → bind oa_user_id + mark reachable
//   * unfollow (removed / blocked) → mark unreachable so the cron stops
//                                    pushing (the user has to re-follow or a
//                                    fresh friendship check to flip it back)
//
// Security: every request must carry a valid X-Line-Signature (HMAC-SHA256
// with the channel secret) or it is rejected. This endpoint is NOT under
// /api, so the proxy.ts rate limiter does not apply to it. It always answers
// 200 so LINE does not retry events we processed or cannot process.
// ============================================================================

interface LineWebhookEvent {
  type?: string;
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
      const userId = event.source?.userId;
      if (!userId) {
        continue;
      }

      if (event.type === "follow") {
        const { error } = await supabase
          .from("users")
          .update({ oa_user_id: userId, line_unreachable: false })
          .eq("line_user_id", userId);

        if (error) {
          console.error(`[LINE webhook] follow bind failed for ${userId}`, error);
        }
      }

      if (event.type === "unfollow") {
        const { error } = await supabase
          .from("users")
          .update({ line_unreachable: true })
          .eq("line_user_id", userId);

        if (error) {
          console.error(`[LINE webhook] unfollow mark failed for ${userId}`, error);
        }
      }
    }
  } catch (error) {
    // Keep the wire protocol healthy: LINE never sees a 5xx for events we
    // fail to handle. The failure is logged instead.
    console.error("[LINE webhook] processing failed", error);
  }

  return Response.json({ success: true });
}