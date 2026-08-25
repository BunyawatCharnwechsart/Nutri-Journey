import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { sessionIdSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * POST /api/v1/if-sessions/end-eating
 *
 * Marks the eating phase of a session as finished and starts the fasting
 * phase: records eating_end_time + eating_duration_minutes (computed from
 * server time) and moves fasting_start_time to now so the fasting duration is
 * measured from this point. Only the session owner can call this; the
 * userId comes from the verified session cookie.
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
    .select(
      "id, fasting_start_time, fasting_end_time, status"
    )
    .eq("id", sessionId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!session) {
    return apiError("ไม่พบเซสชัน IF นี้", 404, "NOT_FOUND");
  }

  if (session.status !== "active") {
    return apiError("เซสชันนี้สิ้นสุดแล้ว", 409, "CONFLICT");
  }

  if (session.fasting_end_time) {
    return apiError("การอดสิ้นสุดแล้ว", 409, "CONFLICT");
  }

  const now = new Date();
  const fastingStart = new Date(session.fasting_start_time).getTime();
  const fastingDurationMinutes = Math.max(
    0,
    Math.round((now.getTime() - fastingStart) / 60000)
  );

  const { data: updated, error } = await supabase
    .from("if_sessions")
    .update({
      fasting_end_time: now.toISOString(),
      fasting_duration_minutes: fastingDurationMinutes,
      eating_start_time: now.toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error || !updated) {
    return apiError("Failed to end eating phase", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ session: updated }, { status: 200 });
}