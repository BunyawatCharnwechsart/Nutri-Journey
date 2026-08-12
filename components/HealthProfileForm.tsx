"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import {
  ACTIVITY_LEVELS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
} from "@/lib/profile";
import BirthDatePicker from "@/components/BirthDatePicker";

export interface HealthProfileValues {
  gender: string;
  birthDate: string;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: string;
  waistCm: number | null;
  hipCm: number | null;
  chestCm: number | null;
  goal: string;
  targetWeightKg: number | null;
}

interface HealthProfileFormProps {
  initialValues: HealthProfileValues;
  avatarUrl: string | null;
}

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30";

const labelClass =
  "mb-2 flex items-center gap-2 text-sm font-medium text-zinc-700";

const secondaryButtonClass =
  "flex h-12 items-center justify-center rounded-full border border-zinc-200 px-5 text-base font-semibold text-zinc-700 transition-colors hover:bg-zinc-50";

const primaryButtonClass =
  "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#18A659] px-5 text-base font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:cursor-not-allowed disabled:opacity-60";

export default function HealthProfileForm({
  initialValues,
  avatarUrl,
}: HealthProfileFormProps) {
  const router = useRouter();

  const [gender, setGender] = useState(initialValues.gender);
  const [birthDate, setBirthDate] = useState(initialValues.birthDate);
  const [heightCm, setHeightCm] = useState(
    initialValues.heightCm?.toString() ?? ""
  );
  const [weightKg, setWeightKg] = useState(
    initialValues.weightKg?.toString() ?? ""
  );
  const [activityLevel, setActivityLevel] = useState(initialValues.activityLevel);
  const [waistCm, setWaistCm] = useState(
    initialValues.waistCm?.toString() ?? ""
  );
  const [hipCm, setHipCm] = useState(initialValues.hipCm?.toString() ?? "");
  const [chestCm, setChestCm] = useState(
    initialValues.chestCm?.toString() ?? ""
  );
  const [goal, setGoal] = useState(initialValues.goal);
  const [targetWeightKg, setTargetWeightKg] = useState(
    initialValues.targetWeightKg?.toString() ?? ""
  );
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepTitles: Record<number, string> = {
    1: "ข้อมูลสุขภาพ",
    2: "สัดส่วน",
    3: "เป้าหมาย",
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (step === 1 && birthDate === "") {
      setError("กรุณาเลือกวันเกิดของคุณ");
      return;
    }

    if (step < 3) {
      setStep((current) => current + 1);
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          birthDate,
          heightCm: Number(heightCm),
          weightKg: Number(weightKg),
          activityLevel,
          waistCm: waistCm === "" ? null : Number(waistCm),
          hipCm: hipCm === "" ? null : Number(hipCm),
          chestCm: chestCm === "" ? null : Number(chestCm),
          goal: goal === "" ? undefined : goal,
          targetWeightKg:
            targetWeightKg === "" ? undefined : Number(targetWeightKg),
        }),
      });

      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!res.ok) {
        throw new Error(json?.error?.message ?? "บันทึกข้อมูลไม่สำเร็จ");
      }

      setSaving(false);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกข้อมูลไม่สำเร็จ");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <header className="flex flex-col items-center gap-6 text-center">
        {step === 1 ? (
          <>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
              {stepTitles[step]}
            </h1>
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
          </>
        ) : (
          <>
            {step === 2 ? (
              <Image
                src="/icon/proportionIcon.svg"
                alt=""
                aria-hidden="true"
                width={126}
                height={126}
                className="shrink-0"
              />
            ) : (
              <Image
                src="/icon/targetIcon.svg"
                alt=""
                aria-hidden="true"
                width={126}
                height={126}
                className="shrink-0"
              />
            )}
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
              {stepTitles[step]}
            </h1>
          </>
        )}
      </header>

      {step === 2 && (
        <p className="-mt-6 text-center text-sm text-zinc-500">
          ใส่ข้อมูลสัดส่วนเพื่อที่ตอนทำ IF จะได้เห็นผลลัพธ์เพิ่มเติม
        </p>
      )}
      {step === 3 && (
        <p className="-mt-6 text-center text-sm text-zinc-500">
          เป้าหมายหลักของคุณ
        </p>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
              <Image
                src="/icon/genderIcon.svg"
                alt=""
                aria-hidden="true"
                width={22}
                height={22}
                className="shrink-0"
              />
              เพศ
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                    gender === option.value
                      ? "border-[#18A659] bg-[#18A659]/10 text-[#148D4C]"
                      : "border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={gender === option.value}
                    onChange={() => setGender(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="birth-date"
              className={`${labelClass} cursor-pointer`}
            >
              <Image
                src="/icon/birthdayIcon.svg"
                alt=""
                aria-hidden="true"
                width={22}
                height={22}
                className="shrink-0"
              />
              วันเดือนปีเกิด
            </label>
            <BirthDatePicker
              value={birthDate}
              onChange={(date) => setBirthDate(date)}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="height-cm" className={labelClass}>
                <Image
                  src="/icon/heightIcon.svg"
                  alt=""
                  aria-hidden="true"
                  width={22}
                  height={22}
                  className="shrink-0"
                />
                ส่วนสูง (เซนติเมตร)
              </label>
              <input
                id="height-cm"
                type="number"
                inputMode="decimal"
                min={50}
                max={250}
                step={0.1}
                placeholder="เช่น 165"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="weight-kg" className={labelClass}>
                <Image
                  src="/icon/weightIcon.svg"
                  alt=""
                  aria-hidden="true"
                  width={22}
                  height={22}
                  className="shrink-0"
                />
                น้ำหนัก (กิโลกรัม)
              </label>
              <input
                id="weight-kg"
                type="number"
                inputMode="decimal"
                min={20}
                max={300}
                step={0.1}
                placeholder="เช่น 58.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="activity-level" className={labelClass}>
              <Image
                src="/icon/activityLevelIcon.svg"
                alt=""
                aria-hidden="true"
                width={22}
                height={22}
                className="shrink-0"
              />
              ระดับกิจกรรม
            </label>
            <select
              id="activity-level"
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              className={inputClass}
              required
            >
              <option value="" disabled>
                เลือกระดับกิจกรรมของคุณ
              </option>
              {ACTIVITY_LEVELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-6">
          <div>
            <label htmlFor="waist-cm" className={labelClass}>
              รอบเอว (เซนติเมตร)
            </label>
              <input
                id="waist-cm"
                type="number"
                inputMode="decimal"
                min={30}
                max={250}
                step={0.1}
                placeholder="เช่น 75"
                value={waistCm}
                onChange={(e) => setWaistCm(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="hip-cm" className={labelClass}>
                รอบสะโพก (เซนติเมตร)
              </label>
              <input
                id="hip-cm"
                type="number"
                inputMode="decimal"
                min={30}
                max={250}
                step={0.1}
                placeholder="เช่น 95"
                value={hipCm}
                onChange={(e) => setHipCm(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="chest-cm" className={labelClass}>
                รอบอก (เซนติเมตร)
              </label>
              <input
                id="chest-cm"
                type="number"
                inputMode="decimal"
                min={30}
                max={250}
                step={0.1}
                placeholder="เช่น 88"
                value={chestCm}
                onChange={(e) => setChestCm(e.target.value)}
                className={inputClass}
              />
            </div>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-6">
          <div>
            <label htmlFor="goal" className={labelClass}>
              เป้าหมายของคุณ
            </label>
            <select
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                เลือกเป้าหมายของคุณ
              </option>
              {GOAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="target-weight" className={labelClass}>
              น้ำหนักเป้าหมาย (กิโลกรัม)
            </label>
            <input
              id="target-weight"
              type="number"
              inputMode="decimal"
              min={20}
              max={300}
              step={0.1}
              placeholder="เช่น 55"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)}
              className={inputClass}
            />
          </div>
        </section>
      )}

      {saving && !success && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white/85 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <Image
            src="/icon.svg"
            alt="กำลังบันทึก"
            width={76}
            height={76}
            className="animate-pulse"
            priority
          />
          <p className="max-w-[260px] text-center text-sm font-medium text-zinc-500">
            เรากำลังตั้งค่ากำลังคำนวณเพื่อให้เหมาะกับคุณมากที่สุด กรุณารอสักครู่...
          </p>
        </div>
      )}

      {success && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white/85 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="relative">
            <Image
              src="/icon.svg"
              alt=""
              width={76}
              height={76}
              aria-hidden
              priority
            />
            <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#18A659] text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6 9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
          <p className="text-xl font-bold text-zinc-900">ตั้งค่าเสร็จสิ้น</p>
          <p className="max-w-[280px] text-center text-sm text-zinc-500">
            เริ่มต้นการเดินทางสู่สุขภาพที่ดีไปกับ NutriJourney กันเลย!
          </p>
          <button
            type="button"
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
            className="mt-1 w-64 max-w-full rounded-full bg-[#18A659] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#148D4C]"
          >
            ไปยังหน้าหลัก
          </button>
        </div>
      )}

      {error && (
        <p
          className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((current) => current - 1)}
            className={secondaryButtonClass}
            disabled={saving}
          >
            กลับ
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className={primaryButtonClass}
        >
          {saving
            ? "กำลังบันทึก..."
            : step < 3
              ? "ถัดไป"
              : "เสร็จสิ้น"}
        </button>
      </div>
    </form>
  );
}