import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { weightLogSchema } from "@/lib/validation";
import { canUpdateWeight, getICTDateKey } from "@/lib/weight-log";

export const runtime = "nodejs";

/**
 * POST /api/v1/weight-logs
 *
 * Records the user's weight for today (one entry per calendar day).
 * weight_logs is the single source of truth — profiles.weight is not synced
 * anymore.
 *
 * Guarded server-side by the once-per-ICT-month rule: the user may only log a
 * new weight when their latest entry falls in an earlier month (or when they
 * have no history yet). The client hides the button, but the API re-checks so
 * the rule cannot be bypassed.
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
      "บันทึกน้ำหนักเดือนนี้แล้ว อัปเดตได้อีกครั้งวันที่ 1 เดือนถัดไป",
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

  return apiSuccess({ log }, { status: 200 });
}