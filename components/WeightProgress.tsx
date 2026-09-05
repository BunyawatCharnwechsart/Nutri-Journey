"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface WeightProgressProps {
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  canUpdate: boolean;
  daysUntilNext: number;
}

/**
 * ส่วนแสดงผล "การจัดการน้ำหนัก" ที่ฝังอยู่ในข้อมูลส่วนตัว:
 * - ช่อง "อีก X กก. จะถึงเป้าหมาย"
 * - ปุ่ม "อัปเดตน้ำหนัก" หรือ countdown "อัปเดตได้อีกใน X วัน"
 * - modal รับน้ำหนักใหม่ (POST /api/v1/weight-logs)
 *
 * ใช้ปุ่ม/API แบบเดียวกับเดิม: ระบบล็อก 7 วัน ตาม record ล่าสุดใน weight_logs.
 */
export default function WeightProgress({
  currentWeightKg,
  targetWeightKg,
  canUpdate,
  daysUntilNext,
}: WeightProgressProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    currentWeightKg?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setInputValue(currentWeightKg?.toString() ?? "");
    setError(null);
    setOpen(true);
  }

  async function handleSave() {
    const weightKg = Number(inputValue);
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 300) {
      setError("กรุณากรอกน้ำหนักระหว่าง 20-300 กก.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/weight-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!res.ok) {
        throw new Error(json?.error?.message ?? "บันทึกน้ำหนักไม่สำเร็จ");
      }

      setOpen(false);
      // Re-fetch server props so current weight + lock state update.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกน้ำหนักไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {currentWeightKg != null && targetWeightKg != null && (() => {
        const remaining =
          Math.round(Math.abs(currentWeightKg - targetWeightKg) * 10) / 10;
        const message =
          currentWeightKg === targetWeightKg
            ? "น้ำหนักถึงเป้าหมายแล้ว"
            : `อีก ${remaining} กก. จะถึงเป้าหมาย`;
        return (
          <div className="rounded-xl bg-[#18A659]/10 px-4 py-3 text-center text-sm font-medium text-[#148D4C]">
            {message}
          </div>
        );
      })()}

      {canUpdate ? (
        <button
          type="button"
          onClick={openModal}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#18A659] px-5 text-base font-semibold text-white transition-colors hover:bg-[#148D4C]"
        >
          อัปเดตน้ำหนัก
        </button>
      ) : (
        <div className="flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-5 text-base font-semibold text-zinc-400">
          อัปเดตได้อีกใน {daysUntilNext} วัน
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="อัปเดตน้ำหนัก"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900">อัปเดตน้ำหนัก</h3>
            <p className="mt-1 text-sm text-zinc-500">
              บันทึกน้ำหนักวันนี้เพื่อติดตามผล
            </p>

            <label
              htmlFor="new-weight"
              className="mt-4 mb-2 block text-sm font-medium text-zinc-700"
            >
              น้ำหนัก (กิโลกรัม)
            </label>
            <input
              id="new-weight"
              type="number"
              inputMode="decimal"
              autoFocus
              min={20}
              max={300}
              step={0.1}
              placeholder="เช่น 58.5"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
                if (e.key === "Escape") setOpen(false);
              }}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30"
            />

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
                onClick={() => setOpen(false)}
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
    </div>
  );
}