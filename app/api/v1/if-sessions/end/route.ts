import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { sessionIdSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * POST /api/v1/if-sessions/end
 *
 * Ends a fasting session: computes the real duration from server time and
 * marks it completed. Only the session owner can end it; the userId comes
 * from the verified session cookie.
 *
 * The user must finish the eating phase first (POST /end-eating). Until then
 * fasting_start_time still points at the session start, so ending here would
 * wrongly count the whole eating window as fasting time — hence the 409.
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400, "VALIDATION_ERROR");
  }

  const parsed = sessionIdSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR");
  }

  const { sessionId } = parsed.data;
  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from("if_sessions")
    .select("id, eating_start_time, fasting_end_time, status")
    .eq("id", sessionId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!session) {
    return apiError("ไม่พบเซสชัน IF นี้", 404, "NOT_FOUND");
  }

  if (session.status !== "active") {
    return apiError("เซสชันนี้สิ้นสุดแล้ว", 409, "CONFLICT");
  }

  if (!session.fasting_end_time) {
    return apiError(
      "กรุณาสิ้นสุดการอดก่อนสิ้นสุดการกิน",
      409,
      "CONFLICT"
    );
  }

  if (!session.eating_start_time) {
    return apiError(
      "ไม่พบเวลาเริ่มกิน",
      409,
      "CONFLICT"
    );
  }

  const now = new Date();
  const eatingStart = new Date(session.eating_start_time).getTime();
  const eatingDurationMinutes = Math.max(
    0,
    Math.round((now.getTime() - eatingStart) / 60000)
  );

  const { data: updated, error } = await supabase
    .from("if_sessions")
    .update({
      status: "completed",
      eating_end_time: now.toISOString(),
      eating_duration_minutes: eatingDurationMinutes,
    })
    .eq("id", sessionId)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error || !updated) {
    return apiError("Failed to end IF session", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ session: updated }, { status: 200 });
}