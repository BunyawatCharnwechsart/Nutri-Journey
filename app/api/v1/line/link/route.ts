import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { checkFriendship } from "@/lib/line-friendship";
import { getLineLinkState } from "@/lib/line-link";

export const runtime = "nodejs";

// ============================================================================
// /api/v1/line/link
//
// Notification readiness management. Because oa_user_id === line_user_id
// (same LINE provider), there is no account-linking handshake left:
//
//   GET    → readiness state, including whether the one-time onboarding prompt
//            has been answered (onboarded).
//   POST   → answer the prompt with "yes": re-check OA friendship and turn
//            notifications ON (also marks the prompt answered).
//   DELETE → turn notifications OFF / answer "no" later (marks it answered).
//            The OA id stays; login re-binds it.
//
// Answering "no" once (first login) without asking again lives in
// ./dismiss/route.ts.
//
// Only the session owner can do any of this (requireAuth).
// ============================================================================

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  try {
    const supabase = createServiceClient();
    const state = await getLineLinkState(supabase, auth.userId);
    return apiSuccess(state);
  } catch (error) {
    console.error("[LINE link] status failed", error);
    return apiError("เกิดข้อผิดพลาดในการตรวจสถานะ", 500, "INTERNAL_ERROR");
  }
}

export async function POST() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  try {
    const supabase = createServiceClient();
    const { data: row } = await supabase
      .from("users")
      .select("line_user_id")
      .eq("user_id", auth.userId)
      .maybeSingle();

    const lineUserId = row?.line_user_id ?? null;

    // Re-check friendship so the UI can show an "add friend" call-to-action
    // even though notifications are enabled.
    let friend: boolean | null = null;
    try {
      const status = await checkFriendship(lineUserId ?? "");
      friend = status === "friend";
    } catch (error) {
      console.error("[LINE link] friendship check failed", error);
    }

    const { error } = await supabase
      .from("users")
      .update({
        line_notifications_enabled: true,
        line_unreachable: false,
        line_onboarding_answered: true,
      })
      .eq("user_id", auth.userId);

    if (error) {
      return apiError("เปิดการแจ้งเตือนไม่สำเร็จ", 500, "INTERNAL_ERROR");
    }

    return apiSuccess({ linked: true, friend, onboarded: true });
  } catch (error) {
    console.error("[LINE link] enable failed", error);
    return apiError("เปิดการแจ้งเตือนไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }
}

export async function DELETE() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("users")
      .update({
        line_notifications_enabled: false,
        line_onboarding_answered: true,
      })
      .eq("user_id", auth.userId);

    if (error) {
      return apiError("ปิดการแจ้งเตือนไม่สำเร็จ", 500, "INTERNAL_ERROR");
    }

    return apiSuccess({ linked: false, onboarded: true });
  } catch (error) {
    console.error("[LINE link] disable failed", error);
    return apiError("ปิดการแจ้งเตือนไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }
}