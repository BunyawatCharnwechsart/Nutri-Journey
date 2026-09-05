"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ACTIVITY_LEVELS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
} from "@/lib/profile";
import BirthDatePicker from "@/components/BirthDatePicker";

interface EditProfileModalProps {
  gender: string;
  birthDate: string;
  heightCm: number | null;
  activityLevel: string;
  goal: string;
  targetWeightKg: number | null;
}

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30";
const selectClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30";

/**
 * "แก้ไขข้อมูล" modal on the profile page.
 *
 * Only static health info can change here: เพศ, วันเกิด, ส่วนสูง,
 * ระดับกิจกรรม, เป้าหมาย and น้ำหนักเป้าหมาย. Weight and measurements are
 * deliberately absent — they have dedicated flows (weight_logs lock + the
 * อัปเดตสัดส่วน modal), so this modal never touches them.
 */
export default function EditProfileModal({
  gender,
  birthDate,
  heightCm,
  activityLevel,
  goal,
  targetWeightKg,
}: EditProfileModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [genderValue, setGenderValue] = useState(gender);
  const [birthDateValue, setBirthDateValue] = useState(birthDate);
  const [height, setHeight] = useState("");
  const [activityLevelValue, setActivityLevelValue] = useState(activityLevel);
  const [goalValue, setGoalValue] = useState(goal);
  const [targetWeight, setTargetWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    // Seed every field with the current profile value so the user edits in
    // place instead of retyping everything.
    setGenderValue(gender);
    setBirthDateValue(birthDate);
    setHeight(heightCm != null ? String(heightCm) : "");
    setActivityLevelValue(activityLevel);
    setGoalValue(goal);
    setTargetWeight(targetWeightKg != null ? String(targetWeightKg) : "");
    setError(null);
    setOpen(true);
  }

  function closeModal() {
    if (!saving) {
      setOpen(false);
    }
  }

  async function handleSave() {
    const heightCmNumber = Number(height);
    const targetWeightKgNumber = Number(targetWeight);

    const hasError =
      !genderValue ||
      !birthDateValue ||
      !Number.isFinite(heightCmNumber) ||
      heightCmNumber < 50 ||
      heightCmNumber > 250 ||
      !activityLevelValue ||
      !goalValue ||
      !Number.isFinite(targetWeightKgNumber) ||
      targetWeightKgNumber < 20 ||
      targetWeightKgNumber > 300;

    if (hasError) {
      setError("กรุณาใส่ข้อมูลให้ครบและถูกต้อง (ส่วนสูง 50-250 ซม., น้ำหนักเป้าหมาย 20-300 กก.)");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: genderValue,
          birthDate: birthDateValue,
          heightCm: heightCmNumber,
          activityLevel: activityLevelValue,
          goal: goalValue,
          targetWeightKg: targetWeightKgNumber,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!res.ok) {
        throw new Error(json?.error?.message ?? "บันทึกข้อมูลไม่สำเร็จ");
      }

      setOpen(false);
      // Re-fetch server props so the updated values render immediately.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-full border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
      >
        แก้ไขข้อมูล
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="แก้ไขข้อมูล"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900">แก้ไขข้อมูล</h3>
            <p className="mt-1 text-sm text-zinc-500">
              แก้ไขเฉพาะข้อมูลพื้นฐานของคุณ
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label
                  htmlFor="edit-profile-gender"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  เพศ
                </label>
                <select
                  id="edit-profile-gender"
                  value={genderValue}
                  onChange={(e) => setGenderValue(e.target.value)}
                  className={selectClass}
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium text-zinc-700">
                  วันเกิด
                </span>
                <BirthDatePicker
                  value={birthDateValue}
                  onChange={setBirthDateValue}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-profile-height"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  ส่วนสูง (ซม.)
                </label>
                <input
                  id="edit-profile-height"
                  type="number"
                  inputMode="numeric"
                  min={50}
                  max={250}
                  step={1}
                  placeholder="เช่น 175"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-profile-activity"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  ระดับกิจกรรม
                </label>
                <select
                  id="edit-profile-activity"
                  value={activityLevelValue}
                  onChange={(e) => setActivityLevelValue(e.target.value)}
                  className={selectClass}
                >
                  {ACTIVITY_LEVELS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-profile-goal"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  เป้าหมาย
                </label>
                <select
                  id="edit-profile-goal"
                  value={goalValue}
                  onChange={(e) => setGoalValue(e.target.value)}
                  className={selectClass}
                >
                  {GOAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-profile-target-weight"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  น้ำหนักเป้าหมาย (กก.)
                </label>
                <input
                  id="edit-profile-target-weight"
                  type="number"
                  inputMode="decimal"
                  min={20}
                  max={300}
                  step={0.1}
                  placeholder="เช่น 65"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSave();
                    if (e.key === "Escape") closeModal();
                  }}
                  className={inputClass}
                />
              </div>
            </div>

            {error && (
              <p
                className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-14 flex-1 items-center justify-center rounded-full border border-zinc-300 text-base font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex h-14 flex-1 items-center justify-center rounded-full bg-[#18A659] px-5 text-base font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}