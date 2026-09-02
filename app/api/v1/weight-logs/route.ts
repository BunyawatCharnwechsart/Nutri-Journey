import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { weightLogSchema } from "@/lib/validation";
import { canUpdateWeight, getICTDateKey } from "@/lib/weight-log";

export const runtime = "nodejs";

/**
 * POST /api/v1/weight-logs
 *
 * Records the user's weight for today (one entry per calendar day) and syncs
 * it onto profiles.weight (current weight). Seeds profiles.starting_weight on
 * the very first entry.
 *
 * Guarded server-side by the 15-day rule: the user may only log a new weight
 * once at least 15 days have passed since their latest entry. The client hides
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
      "ยังไม่ครบ 15 วันนับจากบันทึกน้ำหนักล่าสุด",
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