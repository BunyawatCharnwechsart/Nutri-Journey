import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import { isProfileComplete } from "@/lib/profile";
import { createServiceClient } from "@/lib/supabase/service";
import HealthProfileForm from "@/components/HealthProfileForm";

export const dynamic = "force-dynamic";

const EMPTY_FORM = {
  gender: "",
  birthDate: "",
  heightCm: null,
  weightKg: null,
  activityLevel: "",
  waistCm: null,
  hipCm: null,
  chestCm: null,
  goal: "",
  targetWeightKg: null,
};

export default async function HealthProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "gender, birth_date, height, weight, activity_level, waist_cm, hip_cm, chest_cm, goal, target_weight"
    )
    .eq("user_id", userId)
    .maybeSingle();

  // Already filled in → don't show the setup page again.
  if (isProfileComplete(profile)) {
    redirect("/dashboard");
  }

  const { data: user } = await supabase
    .from("users")
    .select("avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  const avatarUrl = user?.avatar_url ?? null;

  const initialValues = {
    ...EMPTY_FORM,
    gender: typeof profile?.gender === "string" ? profile.gender : "",
    birthDate: typeof profile?.birth_date === "string" ? profile.birth_date : "",
    heightCm: profile?.height != null ? Number(profile.height) : null,
    weightKg: profile?.weight != null ? Number(profile.weight) : null,
    activityLevel:
      typeof profile?.activity_level === "string" ? profile.activity_level : "",
    waistCm: profile?.waist_cm != null ? Number(profile.waist_cm) : null,
    hipCm: profile?.hip_cm != null ? Number(profile.hip_cm) : null,
    chestCm: profile?.chest_cm != null ? Number(profile.chest_cm) : null,
    goal: typeof profile?.goal === "string" ? profile.goal : "",
    targetWeightKg:
      profile?.target_weight != null ? Number(profile.target_weight) : null,
  };

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <HealthProfileForm initialValues={initialValues} avatarUrl={avatarUrl} />
      </div>
    </main>
  );
}
