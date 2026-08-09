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
};

export default async function HealthProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("gender, birth_date, height, weight, activity_level")
    .eq("user_id", userId)
    .maybeSingle();

  // Already filled in → don't show the setup page again.
  if (isProfileComplete(profile)) {
    redirect("/dashboard");
  }

  const initialValues = {
    ...EMPTY_FORM,
    gender: typeof profile?.gender === "string" ? profile.gender : "",
    birthDate: typeof profile?.birth_date === "string" ? profile.birth_date : "",
    heightCm: profile?.height != null ? Number(profile.height) : null,
    weightKg: profile?.weight != null ? Number(profile.weight) : null,
    activityLevel:
      typeof profile?.activity_level === "string" ? profile.activity_level : "",
  };

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Health Profile
          </h1>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            กรอกข้อมูลสุขภาพของคุณ เพื่อให้ Nutri Journey คำนวณและแนะนำได้
            เหมาะสมกับตัวคุณ
          </p>
        </header>

        <HealthProfileForm initialValues={initialValues} />
      </div>
    </main>
  );
}