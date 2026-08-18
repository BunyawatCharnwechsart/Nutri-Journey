import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { ifStartSchema } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * POST /api/v1/if-sessions/start
 *
 * Starts a new IF session. Every session begins with the eating phase, so
 * both fasting_start_time and eating_start_time are set to now (the end-eating
 * endpoint later moves fasting_start_time to the actual fasting start). If the
 * user already has an active session (e.g. they forgot to end it), it is
 * automatically closed as completed before the new one is created. The userId
 * comes from the verified session cookie, never from the request body.
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

  const parsed = ifStartSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR");
  }

  const { ifPattern } = parsed.data;
  const supabase = createServiceClient();

  // Auto-close any stale active session for this user before starting a new one.
  const { data: active } = await supabase
    .from("if_sessions")
    .select("id, fasting_start_time")
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .order("fasting_start_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active) {
    const now = new Date();
    const durationMinutes = Math.max(
      0,
      Math.round(
        (now.getTime() - new Date(active.fasting_start_time).getTime()) / 60000
      )
    );

    const { error: closeError } = await supabase
      .from("if_sessions")
      .update({
        status: "completed",
        fasting_end_time: now.toISOString(),
        fasting_duration_minutes: durationMinutes,
      })
      .eq("id", active.id)
      .eq("user_id", auth.userId);

    if (closeError) {
      return apiError("Failed to close previous session", 500, "INTERNAL_ERROR");
    }
  }

  const { data: session, error } = await supabase
    .from("if_sessions")
    .insert({
      user_id: auth.userId,
      fasting_start_time: new Date().toISOString(),
      eating_start_time: new Date().toISOString(),
      status: "active",
      if_pattern: ifPattern,
    })
    .select("*")
    .single();

  if (error || !session) {
    return apiError("Failed to start IF session", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ session }, { status: 201 });
}