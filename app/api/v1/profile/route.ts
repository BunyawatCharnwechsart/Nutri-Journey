import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { healthProfileSchema, editProfileSchema } from "@/lib/validation";
import { getICTDateKey } from "@/lib/weight-log";

export const runtime = "nodejs";

/**
 * POST /api/v1/profile
 *
 * Saves the health profile fields (gender, birth date, height, activity
 * level, measurements, goal, target weight). Requires a valid session
 * cookie; the userId comes from the verified JWT, never from the request
 * body.
 *
 * Weight is NOT stored on profiles anymore: weight_logs is the single source
 * of truth. Saving this form only logs a new weight entry when the entered
 * value differs from the latest log.
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

  const parsed = healthProfileSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const {
    gender,
    birthDate,
    heightCm,
    activityLevel,
    waistIn,
    hipIn,
    chestIn,
    goal,
    targetWeightKg,
  } = parsed.data;

  // Round to one decimal so stored weight_logs values stay clean and
  // consistent with the /api/v1/weight-logs route.
  const weightKg = Math.round(parsed.data.weightKg * 10) / 10;

  const supabase = createServiceClient();

  // weight_logs is the single source of truth for the user's weight. A new log
  // entry is written only when the entered weight differs from the latest log
  // — so a brand-new user's wizard input becomes their first log, while simply
  // re-saving the form (e.g. changing gender) never pollutes the weight chart
  // and can never reset the 7-day update lock.
  const { data: lastLog } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("user_id", auth.userId)
    .order("recorded_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestWeightKg =
    lastLog?.weight_kg != null ? Number(lastLog.weight_kg) : null;

  if (weightKg !== latestWeightKg) {
    const now = new Date();
    const { error: logError } = await supabase.from("weight_logs").upsert(
      {
        user_id: auth.userId,
        recorded_on: getICTDateKey(now.getTime()),
        weight_kg: weightKg,
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id,recorded_on" }
    );

    if (logError) {
      return apiError("Failed to save profile", 500, "INTERNAL_ERROR");
    }
  }

  // Upsert so a brand-new (or accidentally-cleared) profile row is created
  // automatically instead of failing an UPDATE that matches nothing. Weight
  // columns (weight/starting_weight) are intentionally no longer touched.
  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: auth.userId,
        gender,
        birth_date: birthDate,
        height: heightCm,
        activity_level: activityLevel,
        waist_in: waistIn,
        hip_in: hipIn,
        chest_in: chestIn,
        goal,
        target_weight: targetWeightKg,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error || !profile) {
    return apiError("Failed to save profile", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ profile }, { status: 200 });
}

/**
 * PATCH /api/v1/profile
 *
 * Basic profile edit from the "แก้ไขข้อมูล" modal: gender, birth date,
 * height, activity level, goal and target weight only.
 *
 * Scoped strictly to the authenticated user id from the verified JWT. This
 * intentionally never touches weight_logs or the measurement columns —
 * those have their own dedicated flows.
 */
export async function PATCH(request: Request) {
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

  const parsed = editProfileSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return apiError(message, 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const { gender, birthDate, heightCm, activityLevel, goal, targetWeightKg } =
    parsed.data;

  const supabase = createServiceClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      gender,
      birth_date: birthDate,
      height: heightCm,
      activity_level: activityLevel,
      goal,
      target_weight: targetWeightKg,
    })
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error || !profile) {
    return apiError("Failed to update profile", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ profile }, { status: 200 });
}