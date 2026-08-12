import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createServiceClient } from "@/lib/supabase/service";
import { healthProfileSchema } from "@/lib/validation";

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
    weightKg,
    activityLevel,
    waistCm,
    hipCm,
    chestCm,
    goal,
    targetWeightKg,
  } = parsed.data;

  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      gender,
      birth_date: birthDate,
      height: heightCm,
      weight: weightKg,
      activity_level: activityLevel,
      waist_cm: waistCm ?? null,
      hip_cm: hipCm ?? null,
      chest_cm: chestCm ?? null,
      goal: goal ?? null,
      target_weight: targetWeightKg ?? null,
    })
    .eq("user_id", auth.userId)
    .select("*")
    .single();

  if (error || !profile) {
    return apiError("Failed to save profile", 500, "INTERNAL_ERROR");
  }

  return apiSuccess({ profile }, { status: 200 });
}