import { redirect } from "next/navigation";
import Image from "next/image";

import { getSessionUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  ACTIVITY_LEVELS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  isProfileComplete,
} from "@/lib/profile";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

const GENDER_LABELS: Record<string, string> = Object.fromEntries(
  GENDER_OPTIONS.map((option) => [option.value, option.label])
);
const ACTIVITY_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_LEVELS.map((option) => [option.value, option.label])
);
const GOAL_LABELS: Record<string, string> = Object.fromEntries(
  GOAL_OPTIONS.map((option) => [option.value, option.label])
);

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <Image
        src={icon}
        alt=""
        aria-hidden="true"
        width={22}
        height={22}
        className="shrink-0"
      />
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="ml-auto text-sm font-medium text-zinc-900">{value}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const supabase = createServiceClient();

  const { data: user } = await supabase
    .from("users")
    .select("display_name, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "gender, birth_date, height, weight, activity_level, waist_cm, hip_cm, chest_cm, goal, target_weight"
    )
    .eq("user_id", userId)
    .maybeSingle();

  // Missing health data → send the user back to the setup wizard.
  if (!profile || !isProfileComplete(profile)) {
    redirect("/health-profile");
  }

  const displayName = user?.display_name ?? "นักเดินทางสุขภาพ";
  const avatarUrl = user?.avatar_url ?? null;

  const gender = GENDER_LABELS[profile.gender] ?? profile.gender;
  const activityLevel =
    ACTIVITY_LABELS[profile.activity_level] ?? profile.activity_level;
  const goal = profile.goal ? GOAL_LABELS[profile.goal] ?? profile.goal : "—";

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col items-center gap-4 text-center">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="รูปโปรไฟล์ LINE"
              width={112}
              height={112}
              className="rounded-full"
              priority
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#18A659] text-3xl font-bold text-white">
              NJ
            </div>
          )}
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {displayName}
            </h1>
            <LogoutButton />
          </div>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-zinc-900">ข้อมูลสุขภาพ</h2>
          <InfoRow
            icon="/icon/genderIcon.svg"
            label="เพศ"
            value={gender}
          />
          <InfoRow
            icon="/icon/birthdayIcon.svg"
            label="วันเดือนปีเกิด"
            value={profile.birth_date}
          />
          <InfoRow
            icon="/icon/heightIcon.svg"
            label="ส่วนสูง"
            value={`${profile.height} ซม.`}
          />
          <InfoRow
            icon="/icon/weightIcon.svg"
            label="น้ำหนัก"
            value={`${profile.weight} กก.`}
          />
          <InfoRow
            icon="/icon/activityLevelIcon.svg"
            label="ระดับกิจกรรม"
            value={activityLevel}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-zinc-900">สัดส่วน</h2>
          <InfoRow
            icon="/icon/heightIcon.svg"
            label="รอบเอว"
            value={profile.waist_cm != null ? `${profile.waist_cm} ซม.` : "—"}
          />
          <InfoRow
            icon="/icon/heightIcon.svg"
            label="รอบสะโพก"
            value={profile.hip_cm != null ? `${profile.hip_cm} ซม.` : "—"}
          />
          <InfoRow
            icon="/icon/heightIcon.svg"
            label="รอบอก"
            value={profile.chest_cm != null ? `${profile.chest_cm} ซม.` : "—"}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-zinc-900">เป้าหมาย</h2>
          <InfoRow
            icon="/icon/targetIcon.svg"
            label="เป้าหมายของคุณ"
            value={goal}
          />
          <InfoRow
            icon="/icon/weightIcon.svg"
            label="น้ำหนักเป้าหมาย"
            value={
              profile.target_weight != null
                ? `${profile.target_weight} กก.`
                : "—"
            }
          />
        </section>
      </div>
    </main>
  );
}