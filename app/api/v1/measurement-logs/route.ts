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
 * The user may update only some measurements (e.g. just the waist). Any field
 * not sent falls back to the current value from profiles, so a partial update
 * still results in a complete, valid row. Each successful save creates a NEW
 * row (keeping full history) and resets the 14-day update lock.
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

  const supabase = createServiceClient();

  // Load current values so a partial update can fall back to untouched fields.
  const { data: current } = await supabase
    .from("profiles")
    .select("waist_in, hip_in, chest_in")
    .eq("user_id", auth.userId)
    .maybeSingle();

  const toNumber = (v: unknown): number | null =>
    typeof v === "number" ? v : v != null ? Number(v) : null;

  // Merge: provided fields win, others keep the current value. At least one
  // must be provided (enforced by the schema refine). If there is no existing
  // profile row, a missing field becomes null — but the DB requires all three
  // to be NON-null, so we reject that impossible edge explicitly.
  const waistIn = parsed.data.waistIn ?? toNumber(current?.waist_in);
  const hipIn = parsed.data.hipIn ?? toNumber(current?.hip_in);
  const chestIn = parsed.data.chestIn ?? toNumber(current?.chest_in);

  if (waistIn === null || hipIn === null || chestIn === null) {
    return apiError(
      "ไม่พบข้อมูลสัดส่วนเดิม กรุณากรอกให้ครบ",
      400,
      "VALIDATION_ERROR"
    );
  }

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

  const roundedWaist = Math.round(waistIn * 10) / 10;
  const roundedHip = Math.round(hipIn * 10) / 10;
  const roundedChest = Math.round(chestIn * 10) / 10;

  const { data: log, error: logError } = await supabase
    .from("measurement_logs")
    .upsert(
      {
        user_id: auth.userId,
        recorded_on: recordedOn,
        waist_in: roundedWaist,
        hip_in: roundedHip,
        chest_in: roundedChest,
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
      waist_in: roundedWaist,
      hip_in: roundedHip,
      chest_in: roundedChest,
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
