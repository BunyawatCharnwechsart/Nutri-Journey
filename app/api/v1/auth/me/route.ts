import { createServiceClient } from "@/lib/supabase/service";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  const supabase = createServiceClient();

  // เลือกเฉพาะ field ที่ client จำเป็นต้องใช้จริง — ไม่ดึง oa_user_id /
  // line_user_id / email กลับไป client (LINE id เป็น PII ไม่ควรรั่วไปหน้า UI)
  const { data: user, error: userError } = await supabase
    .from("users")
    .select(
      "user_id, display_name, avatar_url, line_notifications_enabled, line_unreachable, line_onboarding_answered"
    )
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (userError || !user) {
    return apiError("User not found", 404, "NOT_FOUND");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", auth.userId)
    .maybeSingle();

  return apiSuccess({ user, profile });
}
