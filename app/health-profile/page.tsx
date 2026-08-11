import { redirect } from "next/navigation";
import Image from "next/image";

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
  };

  return (
    <main className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col items-center gap-5 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            ข้อมูลสุขภาพ
          </h1>
          <p className="text-sm leading-6 text-zinc-600">
            กรอกข้อมูลสุขภาพของคุณ เพื่อให้ Nutri Journey คำนวณและแนะนำได้
            เหมาะสมกับตัวคุณ
          </p>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="รูปโปรไฟล์ LINE"
              width={96}
              height={96}
              className="rounded-full"
              priority
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#18A659] text-2xl font-bold text-white">
              NJ
            </div>
          )}
        </header>

        <HealthProfileForm initialValues={initialValues} />
      </div>
    </main>
  );
}
