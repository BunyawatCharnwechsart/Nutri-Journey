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
  waistIn: null,
  hipIn: null,
  chestIn: null,
  goal: "",
  targetWeightKg: null,
};

export default async function HealthProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { edit } = await searchParams;
  const editMode = edit === "1";

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "gender, birth_date, height, activity_level, waist_in, hip_in, chest_in, goal, target_weight"
    )
    .eq("user_id", userId)
    .maybeSingle();

  // Already filled in → only re-open the form when explicitly editing.
  if (!editMode && isProfileComplete(profile)) {
    redirect("/dashboard");
  }

  // weight_logs is the single source of truth for weight — the wizard field is
  // seeded from the latest log instead of profiles.weight.
  const { data: latestLog } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("user_id", userId)
    .order("recorded_on", { ascending: false })
    .limit(1)
    .maybeSingle();

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
    weightKg:
      latestLog?.weight_kg != null ? Number(latestLog.weight_kg) : null,
    activityLevel:
      typeof profile?.activity_level === "string" ? profile.activity_level : "",
    waistIn: profile?.waist_in != null ? Number(profile.waist_in) : null,
    hipIn: profile?.hip_in != null ? Number(profile.hip_in) : null,
    chestIn: profile?.chest_in != null ? Number(profile.chest_in) : null,
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
