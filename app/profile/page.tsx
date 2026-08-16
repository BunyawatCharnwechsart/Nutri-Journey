import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";

import { getSessionUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  ACTIVITY_LEVELS,
  GENDER_OPTIONS,
  calculateBmi,
  getBmiCategory,
  isProfileComplete,
} from "@/lib/profile";
import LogoutButton from "@/components/LogoutButton";
import EggIconLink from "@/components/EggIconLink";

export const dynamic = "force-dynamic";

const GENDER_LABELS: Record<string, string> = Object.fromEntries(
  GENDER_OPTIONS.map((option) => [option.value, option.label])
);
const ACTIVITY_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_LEVELS.map((option) => [option.value, option.label])
);
const BMI_COLORS: Record<string, string> = {
  "น้ำหนักน้อย": "#62D4F0",
  ปกติ: "#18A659",
  "น้ำหนักเกิน": "#FFAE00",
  อ้วน: "#FF0000",
};

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

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

export default async function ProfilePage() {
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

  // Missing health data → send the user back to the setup wizard.
  if (!profile || !isProfileComplete(profile)) {
    redirect("/health-profile");
  }

  const gender = GENDER_LABELS[profile.gender] ?? profile.gender;
  const activityLevel =
    ACTIVITY_LABELS[profile.activity_level] ?? profile.activity_level;

  const weightKg = profile.weight != null ? Number(profile.weight) : null;
  const heightCm = profile.height != null ? Number(profile.height) : null;
  const targetWeightKg =
    profile.target_weight != null ? Number(profile.target_weight) : null;

  const bmi = calculateBmi(weightKg, heightCm);
  const bmiCategory = getBmiCategory(bmi);
  const bmiColor = BMI_COLORS[bmiCategory] ?? "#18A659";

  const remainingKg =
    weightKg != null && targetWeightKg != null
      ? Math.round(Math.abs(weightKg - targetWeightKg) * 10) / 10
      : null;

  const goalMessage =
    remainingKg === null
      ? null
      : weightKg === targetWeightKg
        ? "น้ำหนักถึงเป้าหมายแล้ว"
        : `อีก ${remainingKg} กก. จะถึงเป้าหมาย`;

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              โปรไฟล์สุขภาพ
            </h1>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              อัปเดตข้อมูลของคุณเพื่อให้การเดินทางสู่สุขภาพที่ดีเป็นไปตามเป้าหมาย
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[#18A659]">
            <EggIconLink />
          </div>
        </header>

        <section
          className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5"
          style={{
            background: `linear-gradient(135deg, ${bmiColor}40, ${bmiColor}0A)`,
          }}
        >
          <div>
            <p className="text-sm text-zinc-500">BMI ปัจจุบัน</p>
            <p className="text-3xl font-bold" style={{ color: bmiColor }}>
              {bmi ?? "—"}
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-sm font-medium"
            style={{
              color: bmiColor,
              backgroundColor: `${bmiColor}1A`,
            }}
          >
            {bmiCategory}
          </span>
        </section>

        <Card title="ข้อมูลส่วนตัว">
          <InfoRow icon="/icon/genderIcon.svg" label="เพศ" value={gender} />
          <InfoRow
            icon="/icon/birthdayIcon.svg"
            label="วันเดือนปีเกิด"
            value={profile.birth_date}
          />
          <InfoRow
            icon="/icon/heightIcon.svg"
            label="ส่วนสูง"
            value={heightCm != null ? `${heightCm} ซม.` : "—"}
          />
          <InfoRow
            icon="/icon/weightIcon.svg"
            label="น้ำหนัก"
            value={weightKg != null ? `${weightKg} กก.` : "—"}
          />
          <InfoRow
            icon="/icon/activityLevelIcon.svg"
            label="ระดับกิจกรรม"
            value={activityLevel}
          />
        </Card>

        <Card title="การจัดการน้ำหนัก">
          <InfoRow
            icon="/icon/weightIcon.svg"
            label="น้ำหนักปัจจุบัน"
            value={weightKg != null ? `${weightKg} กก.` : "—"}
          />
          <InfoRow
            icon="/icon/targetIcon.svg"
            label="น้ำหนักเป้าหมาย"
            value={targetWeightKg != null ? `${targetWeightKg} กก.` : "—"}
          />
          {goalMessage && (
            <div className="rounded-xl bg-[#18A659]/10 px-4 py-3 text-center text-sm font-medium text-[#148D4C]">
              {goalMessage}
            </div>
          )}
        </Card>

        <Card title="สัดส่วน">
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
        </Card>

        <div className="flex flex-col gap-3">
          <Link
            href="/health-profile?edit=1"
            className="rounded-full border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            แก้ไขข้อมูล
          </Link>
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}