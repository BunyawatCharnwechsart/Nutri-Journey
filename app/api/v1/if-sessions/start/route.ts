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
 * endpoint later moves fasting_start_time to the actual fasting start).
 *
 * Stale active sessions (user forgot to end them) are marked "abandoned", NOT
 * "completed" — they must not inflate stats or streaks. The userId comes from
 * the verified session cookie, never from the request body.
 *
 * Race safety: a partial unique index (if_sessions_one_active_per_user)
 * guarantees one active session per user at the DB level. If two requests
 * race past the check below, the loser gets a unique violation (23505) and we
 * simply return the winner's active session instead of failing.
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

  // Auto-close any stale active session for this user before starting a new
  // one. Marked "abandoned" so it is excluded from completed-session stats.
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
        status: "abandoned",
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
      status: "active",
      if_pattern: ifPattern,
    })
    .select("*")
    .single();

  // Unique violation on the partial index = another request created the
  // active session a moment ago. Return that session so the client resumes
  // it instead of showing an error.
  if (error && error.code === "23505") {
    const { data: existing } = await supabase
      .from("if_sessions")
      .select("*")
      .eq("user_id", auth.userId)
      .eq("status", "active")
      .order("fasting_start_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return apiSuccess({ session: existing }, { status: 200 });
    }
  }

  if (error || !session) {
    return apiError("Failed to start IF session", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ session }, { status: 201 });
}