import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { measurementLogSchema } from "@/lib/validation";
import {
  canUpdateMeasurement,
  getICTDateKey,
} from "@/lib/measurement-log";

export const runtime = "nodejs";

/**
 * POST /api/v1/measurement-logs
 *
 * Records the user's body measurements for today (one entry per calendar day)
 * and syncs them onto profiles (waist_in, hip_in, chest_in).
 *
 * Guarded server-side by the 14-day rule: the user may only log new
 * measurements once at least 14 days have passed since their latest entry.
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

  const parsed = measurementLogSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  // Round to one decimal so stored values stay clean.
  const waistIn = Math.round(parsed.data.waistIn * 10) / 10;
  const hipIn = Math.round(parsed.data.hipIn * 10) / 10;
  const chestIn = Math.round(parsed.data.chestIn * 10) / 10;

  const supabase = createServiceClient();

  const { data: lastLog } = await supabase
    .from("measurement_logs")
    .select("recorded_on")
    .eq("user_id", auth.userId)
    .order("recorded_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    lastLog &&
    !canUpdateMeasurement(Date.now(), lastLog.recorded_on)
  ) {
    return apiError(
      "ยังไม่ครบ 14 วันนับจากบันทึกสัดส่วนล่าสุด",
      409,
      "MEASUREMENT_UPDATE_LOCKED"
    );
  }

  const now = new Date();
  const recordedOn = getICTDateKey(now.getTime());

  const { data: log, error: logError } = await supabase
    .from("measurement_logs")
    .upsert(
      {
        user_id: auth.userId,
        recorded_on: recordedOn,
        waist_in: waistIn,
        hip_in: hipIn,
        chest_in: chestIn,
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id,recorded_on" }
    )
    .select("id, recorded_on, waist_in, hip_in, chest_in")
    .single();

  if (logError) {
    return apiError("บันทึกสัดส่วนไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }

  const { data: updatedProfile, error: profileError } = await supabase
    .from("profiles")
    .update({
      waist_in: waistIn,
      hip_in: hipIn,
      chest_in: chestIn,
      last_measurement_update_at: now.toISOString(),
    })
    .eq("user_id", auth.userId)
    .select("user_id")
    .maybeSingle();

  if (profileError || !updatedProfile) {
    return apiError("บันทึกสัดส่วนไม่สำเร็จ", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ log }, { status: 200 });
}
