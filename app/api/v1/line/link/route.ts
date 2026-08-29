import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { createLinkCode, isLineLinked } from "@/lib/line-link";

export const runtime = "nodejs";

// ============================================================================
// /api/v1/line/link
//
// Connection management between the app and the LINE OA (for push
// notifications). The account-linking protocol:
//
//   1. POST  → create a one-time link code. The frontend then sends
//              `[NJ-LINK] <code>` into the OA chat via liff.sendMessages.
//   2.       → our /webhooks/line route binds users.oa_user_id.
//   3. GET   → whether this user is already linked.
//   4. DELETE → unlink (stop receiving pushes).
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
    const linked = await isLineLinked(supabase, auth.userId);
    return apiSuccess({ linked });
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
    const code = await createLinkCode(supabase, auth.userId);
    return apiSuccess({ code }, { status: 201 });
  } catch (error) {
    console.error("[LINE link] create failed", error);
    return apiError("สร้างรหัสเชื่อมต่อไม่สำเร็จ", 500, "INTERNAL_ERROR");
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
      .update({ oa_user_id: null })
      .eq("user_id", auth.userId);

    if (error) {
      return apiError("ตัดการเชื่อมต่อไม่สำเร็จ", 500, "INTERNAL_ERROR");
    }

    return apiSuccess({ linked: false });
  } catch (error) {
    console.error("[LINE link] unlink failed", error);
    return apiError("ตัดการเชื่อมต่อไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }
}