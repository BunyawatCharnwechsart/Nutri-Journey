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
            <Link href="/my-egg" aria-label="ไข่ของฉัน">
              <svg
                viewBox="0 0 30 30"
                fill="currentColor"
                aria-hidden="true"
                className="h-[30px] w-[30px]"
              >
                <path d="M8.7975 23.7038C7.09917 22.0054 6.25 19.9375 6.25 17.5C6.25 15.8958 6.51583 14.2813 7.0475 12.6563C7.57917 11.0313 8.26667 9.5575 9.11 8.235C9.95333 6.9125 10.8958 5.83417 11.9375 5C12.9792 4.16583 14 3.74917 15 3.75C16.0208 3.75 17.0471 4.16667 18.0788 5C19.1104 5.83333 20.0479 6.91167 20.8912 8.235C21.7346 9.55833 22.4221 11.0321 22.9538 12.6563C23.4854 14.2804 23.7508 15.895 23.75 17.5C23.75 19.9375 22.9012 22.0054 21.2037 23.7038C19.5062 25.4021 17.4383 26.2508 15 26.25C12.5617 26.2492 10.4942 25.4004 8.7975 23.7038ZM19.4225 21.9213C20.6408 20.7029 21.25 19.2292 21.25 17.5C21.25 16.3125 21.0467 15.0625 20.64 13.75C20.2333 12.4375 19.7229 11.2242 19.1087 10.11C18.4946 8.99583 17.8229 8.07375 17.0938 7.34375C16.3646 6.61375 15.6721 6.24917 15.0162 6.25C14.3604 6.25083 13.6625 6.61542 12.9225 7.34375C12.1825 8.07208 11.5054 8.99417 10.8913 10.11C10.2771 11.2258 9.76667 12.4392 9.36 13.75C8.95333 15.0608 8.75 16.3108 8.75 17.5C8.75 19.2292 9.35958 20.7033 10.5788 21.9225C11.7979 23.1417 13.2717 23.7508 15 23.75C16.7283 23.7492 18.2025 23.1396 19.4225 21.9213ZM16.25 22.5C16.6042 22.5 16.9013 22.38 17.1413 22.14C17.3813 21.9 17.5008 21.6033 17.5 21.25C17.4992 20.8967 17.3792 20.6 17.14 20.36C16.9008 20.12 16.6042 20 16.25 20C15.2083 20 14.3229 19.6354 13.5938 18.9063C12.8646 18.1771 12.5 17.2917 12.5 16.25C12.5 15.8958 12.38 15.5992 12.14 15.36C11.9 15.1208 11.6033 15.0008 11.25 15C10.8967 14.9992 10.6 15.1192 10.36 15.36C10.12 15.6008 10 15.8975 10 16.25C10 17.9792 10.6096 19.4533 11.8288 20.6725C13.0479 21.8917 14.5217 22.5008 16.25 22.5Z" />
              </svg>
            </Link>
            <svg
              viewBox="0 0 30 30"
              fill="currentColor"
              aria-hidden="true"
              className="h-[30px] w-[30px]"
            >
              <path d="M15 2C15 2 6 13 6 20C6 25 10 28 15 28C20 28 24 25 24 20C24 13 15 2 15 2Z" />
            </svg>
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