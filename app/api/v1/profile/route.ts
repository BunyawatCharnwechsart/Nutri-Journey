import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { healthProfileSchema } from "@/lib/validation";
import { getICTDateKey } from "@/lib/weight-log";

export const runtime = "nodejs";

/**
 * POST /api/v1/profile
 *
 * Saves the health profile fields (gender, birth date, height, weight,
 * activity level). Requires a valid session cookie; the userId comes from
 * the verified JWT, never from the request body.
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

  // Round to one decimal so stored profiles/weight_logs values stay clean and
  // consistent with the /api/v1/weight-logs route.
  const weightKg = Math.round(parsed.data.weightKg * 10) / 10;

  const supabase = createServiceClient();

  // New-user weight anchor: the very first weight entry (from the profile
  // setup wizard) starts the 7-day update clock. Existing users saving the
  // form again do NOT create/log new entries (count > 0), so the clock can
  // never be reset by editing the profile.
  const { count } = await supabase
    .from("weight_logs")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", auth.userId);

  if (count === 0) {
    const now = new Date();
    const { error: anchorError } = await supabase.from("weight_logs").upsert(
      {
        user_id: auth.userId,
        recorded_on: getICTDateKey(now.getTime()),
        weight_kg: weightKg,
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id,recorded_on" }
    );

    if (anchorError) {
      return apiError("Failed to save profile", 500, "INTERNAL_ERROR");
    }
  }

  // Keep an already-established starting weight; seed it from the current
  // weight for a brand-new user (starting weight = current weight).
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("starting_weight")
    .eq("user_id", auth.userId)
    .maybeSingle();

  // Upsert so a brand-new (or accidentally-cleared) profile row is created
  // automatically instead of failing an UPDATE that matches nothing.
  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: auth.userId,
        gender,
        birth_date: birthDate,
        height: heightCm,
        weight: weightKg,
        starting_weight: existingProfile?.starting_weight ?? weightKg,
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