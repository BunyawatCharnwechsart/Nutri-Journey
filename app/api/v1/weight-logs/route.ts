import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { weightLogQuerySchema, weightLogSchema } from "@/lib/validation";
import {
  canUpdateWeight,
  getICTDateKey,
  getRecentWeightLogWindow,
} from "@/lib/weight-log";

export const runtime = "nodejs";

/**
 * GET /api/v1/weight-logs?months=3
 *
 * Returns the user's weight history for the last `months` calendar months
 * (default 3, max 12), oldest first. The window is inclusive on both ends and
 * always uses the ICT calendar day — exactly the feed a monthly line chart
 * needs ({ recorded_on, weight_kg } per point).
 *
 * Every row is scoped to the authenticated user; the `months` param is the
 * only client-controlled value and is validated with Zod before use.
 */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = weightLogQuerySchema.safeParse(params);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const { fromKey, toKey } = getRecentWeightLogWindow(
    Date.now(),
    parsed.data.months
  );

  const supabase = createServiceClient();

  const { data: logs, error } = await supabase
    .from("weight_logs")
    .select("id, recorded_on, weight_kg")
    .eq("user_id", auth.userId)
    .gte("recorded_on", fromKey)
    .lte("recorded_on", toKey)
    .order("recorded_on", { ascending: true });

  if (error) {
    return apiError("ดึงข้อมูลน้ำหนักไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ logs, from: fromKey, to: toKey });
}

/**
 * POST /api/v1/weight-logs
 *
 * Records the user's weight for today (one entry per calendar day) and syncs
 * it onto profiles.weight (current weight). Seeds profiles.starting_weight on
 * the very first entry.
 *
 * Guarded server-side by the 7-day rule: the user may only log a new weight
 * once at least 7 days have passed since their latest entry. The client hides
 * the button, but the API re-checks so the rule cannot be bypassed.
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

  const parsed = weightLogSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  // Round to one decimal so stored values stay clean.
  const weightKg = Math.round(parsed.data.weightKg * 10) / 10;

  const supabase = createServiceClient();

  const { data: lastLog } = await supabase
    .from("weight_logs")
    .select("recorded_on")
    .eq("user_id", auth.userId)
    .order("recorded_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastLog && !canUpdateWeight(Date.now(), lastLog.recorded_on)) {
    return apiError(
      "ยังไม่ครบ 7 วันนับจากบันทึกน้ำหนักล่าสุด",
      409,
      "WEIGHT_UPDATE_LOCKED"
    );
  }

  const now = new Date();
  const recordedOn = getICTDateKey(now.getTime());

  const { data: log, error: logError } = await supabase
    .from("weight_logs")
    .upsert(
      {
        user_id: auth.userId,
        recorded_on: recordedOn,
        weight_kg: weightKg,
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id,recorded_on" }
    )
    .select("id, recorded_on, weight_kg")
    .single();

  if (logError) {
    return apiError("บันทึกน้ำหนักไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("starting_weight")
    .eq("user_id", auth.userId)
    .maybeSingle();

  const { data: updatedProfile, error: profileError } = await supabase
    .from("profiles")
    .update({
      weight: weightKg,
      starting_weight: profile?.starting_weight ?? weightKg,
    })
    .eq("user_id", auth.userId)
    .select("user_id")
    .maybeSingle();

  if (profileError || !updatedProfile) {
    return apiError("บันทึกน้ำหนักไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ log }, { status: 200 });
}