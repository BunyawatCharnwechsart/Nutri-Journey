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
//   GET    → whether this user is ready to receive LINE pushes.
//   POST   → re-check OA friendship and turn notifications ON.
//   DELETE → turn notifications OFF (the OA id stays; login re-enables it).
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
      .update({ line_notifications_enabled: true, line_unreachable: false })
      .eq("user_id", auth.userId);

    if (error) {
      return apiError("เปิดการแจ้งเตือนไม่สำเร็จ", 500, "INTERNAL_ERROR");
    }

    return apiSuccess({ linked: true, friend });
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
      .update({ line_notifications_enabled: false })
      .eq("user_id", auth.userId);

    if (error) {
      return apiError("ปิดการแจ้งเตือนไม่สำเร็จ", 500, "INTERNAL_ERROR");
    }

    return apiSuccess({ linked: false });
  } catch (error) {
    console.error("[LINE link] disable failed", error);
    return apiError("ปิดการแจ้งเตือนไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }
}