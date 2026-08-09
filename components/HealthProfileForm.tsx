"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { ACTIVITY_LEVELS, GENDER_OPTIONS } from "@/lib/profile";

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
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-[#06C755] focus:ring-2 focus:ring-[#06C755]/30 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50";

const labelClass = "mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

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

  const today = new Date().toISOString().split("T")[0];

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-2xl border border-zinc-200 p-5 sm:p-6 dark:border-zinc-800"
    >
      <fieldset>
        <legend className={labelClass}>เพศ</legend>
        <div className="grid grid-cols-3 gap-2">
          {GENDER_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                gender === option.value
                  ? "border-[#06C755] bg-[#06C755]/10 text-[#05a849]"
                  : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
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
      </fieldset>

      <div>
        <label htmlFor="birth-date" className={labelClass}>
          วันเดือนปีเกิด
        </label>
        <input
          id="birth-date"
          type="date"
          max={today}
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className={inputClass}
          required
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
          className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#06C755] px-5 text-base font-semibold text-white transition-colors hover:bg-[#05a849] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลสุขภาพ"}
      </button>
    </form>
  );
}