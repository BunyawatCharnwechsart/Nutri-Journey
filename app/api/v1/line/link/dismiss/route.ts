import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

// ============================================================================
// /api/v1/line/link/dismiss
//
// Marks the ONE-TIME first-login "want LINE notifications?" prompt as answered
// WITHOUT enabling notifications. The user is never asked again on later
// logins, but can still opt in later from the section (POST /link).
// ============================================================================

export async function POST() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("users")
      .update({ line_onboarding_answered: true })
      .eq("user_id", auth.userId);

    if (error) {
      return apiError("บันทึกการตัดสินใจไม่สำเร็จ", 500, "INTERNAL_ERROR");
    }

    return apiSuccess({ onboarded: true });
  } catch (error) {
    console.error("[LINE link] dismiss failed", error);
    return apiError("บันทึกการตัดสินใจไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }
}