"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { ACTIVITY_LEVELS, GENDER_OPTIONS } from "@/lib/profile";
import BirthDatePicker from "@/components/BirthDatePicker";

export interface HealthProfileValues {
  gender: string;
  birthDate: string;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: string;
}

interface HealthProfileFormProps {
  initialValues: HealthProfileValues;
}

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30";

const labelClass = "mb-2 block text-sm font-medium text-zinc-700";

export default function HealthProfileForm({
  initialValues,
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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
        }),
      });

      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!res.ok) {
        throw new Error(json?.error?.message ?? "บันทึกข้อมูลไม่สำเร็จ");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกข้อมูลไม่สำเร็จ");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
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
      </section>

      <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 p-5 sm:p-6">
        <div>
          <label htmlFor="birth-date" className={labelClass}>
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

        {error && (
          <p
            className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#18A659] px-5 text-base font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลสุขภาพ"}
        </button>
      </div>
    </form>
  );
}