"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MeasurementUpdateCardProps {
  waistIn: number | null;
  hipIn: number | null;
  chestIn: number | null;
  canUpdate: boolean;
  /** สั้นๆ ของวันที่อัปเดตครั้งถัดไป เช่น "1 ก.ย." (null เมื่ออัปเดตได้แล้ว). */
  nextUpdateLabel: string | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-900">{value}</span>
    </div>
  );
}

/**
 * Shows waist / hip / chest measurements and the "อัปเดตสัดส่วน" button.
 *
 * The user may update only the fields they want (e.g. just the waist):
 * one or more inputs are left blank to keep the current value, and only the
 * filled fields are submitted. At least one must be filled.
 *
 * The button (and the API behind it) is locked until the next ICT month — the
 * user may only record measurements once per calendar month; until then a
 * "อัปเดตได้อีกครั้ง {วันที่ 1 เดือนหน้า}" label is shown instead.
 */
export default function MeasurementUpdateCard({
  waistIn,
  hipIn,
  chestIn,
  canUpdate,
  nextUpdateLabel,
}: MeasurementUpdateCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmKeep, setConfirmKeep] = useState(false);
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [chest, setChest] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    // Start with blank inputs: the user only fills in the fields to change.
    // An untouched field stays blank and is not sent (keeps its current value).
    setWaist("");
    setHip("");
    setChest("");
    setError(null);
    setOpen(true);
  }

  async function submitSaved(body: Record<string, number>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/measurement-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!res.ok) {
        throw new Error(json?.error?.message ?? "บันทึกสัดส่วนไม่สำเร็จ");
      }

      setOpen(false);
      setConfirmKeep(false);
      // Re-fetch server props so current measurements + lock state update.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกสัดส่วนไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    // Only parse fields the user actually filled in.
    const waistVal = waist === "" ? undefined : Number(waist);
    const hipVal = hip === "" ? undefined : Number(hip);
    const chestVal = chest === "" ? undefined : Number(chest);

    const valid = (v: number | undefined) =>
      v === undefined || (Number.isFinite(v) && v >= 12 && v <= 98);

    if (!valid(waistVal) || !valid(hipVal) || !valid(chestVal)) {
      setError("กรุณากรอกสัดส่วนระหว่าง 12-98 นิ้ว");
      return;
    }

    const allEmpty =
      waistVal === undefined && hipVal === undefined && chestVal === undefined;

    if (allEmpty) {
      // No field was touched → ask via a confirm modal before keeping the
      // current values as this month's check-in row.
      if (waistIn == null || hipIn == null || chestIn == null) {
        setError("ไม่พบค่าสัดส่วนเดิม กรุณากรอกค่าใหม่");
        return;
      }
      setConfirmKeep(true);
      return;
    }

    const body: Record<string, number> = {};
    if (waistVal !== undefined) body.waistIn = waistVal;
    if (hipVal !== undefined) body.hipIn = hipVal;
    if (chestVal !== undefined) body.chestIn = chestVal;

    await submitSaved(body);
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">สัดส่วน</h2>

      <Row label="รอบเอว" value={waistIn != null ? `${waistIn} นิ้ว` : "—"} />
      <Row label="รอบสะโพก" value={hipIn != null ? `${hipIn} นิ้ว` : "—"} />
      <Row label="รอบอก" value={chestIn != null ? `${chestIn} นิ้ว` : "—"} />

      {canUpdate ? (
        <button
          type="button"
          onClick={openModal}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#18A659] px-5 text-base font-semibold text-white transition-colors hover:bg-[#148D4C]"
        >
          อัปเดตสัดส่วน
        </button>
      ) : (
        <div className="flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-5 text-base font-semibold text-zinc-400">
          อัปเดตได้อีกครั้ง {nextUpdateLabel}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="อัปเดตสัดส่วน"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900">อัปเดตสัดส่วน</h3>
            <p className="mt-1 text-sm text-zinc-500">
              กรอกเฉพาะช่องที่ต้องการแก้ ช่องที่เว้นไว้คงค่าเดิม — เว้นทั้งหมดแล้ว
              กดบันทึก = บันทึกค่าเดิมเป็นบันทึกเดือนนี้
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label
                  htmlFor="measurement-waist"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  รอบเอว (นิ้ว){waistIn != null ? ` — ปัจจุบัน ${waistIn}` : ""}
                </label>
                <input
                  id="measurement-waist"
                  type="number"
                  inputMode="decimal"
                  min={12}
                  max={98}
                  step={0.1}
                  placeholder="เช่น 29.5"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30"
                />
              </div>
              <div>
                <label
                  htmlFor="measurement-hip"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  รอบสะโพก (นิ้ว){hipIn != null ? ` — ปัจจุบัน ${hipIn}` : ""}
                </label>
                <input
                  id="measurement-hip"
                  type="number"
                  inputMode="decimal"
                  min={12}
                  max={98}
                  step={0.1}
                  placeholder="เช่น 37"
                  value={hip}
                  onChange={(e) => setHip(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30"
                />
              </div>
              <div>
                <label
                  htmlFor="measurement-chest"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  รอบอก (นิ้ว){chestIn != null ? ` — ปัจจุบัน ${chestIn}` : ""}
                </label>
                <input
                  id="measurement-chest"
                  type="number"
                  inputMode="decimal"
                  min={12}
                  max={98}
                  step={0.1}
                  placeholder="เช่น 34.5"
                  value={chest}
                  onChange={(e) => setChest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSave();
                    if (e.key === "Escape") setOpen(false);
                  }}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30"
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

      {confirmKeep && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="ยืนยันบันทึกสัดส่วนเดิม"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmKeep(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900">
              บันทึกค่าเดิม?
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              คุณไม่ได้แก้ไขสัดส่วน — ระบบจะบันทึกค่าเดิมเป็นบันทึกเดือนนี้:
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              <li className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 text-sm">
                <span className="text-zinc-500">รอบเอว</span>
                <span className="font-medium text-zinc-900">
                  {waistIn != null ? `${waistIn} นิ้ว` : "—"}
                </span>
              </li>
              <li className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 text-sm">
                <span className="text-zinc-500">รอบสะโพก</span>
                <span className="font-medium text-zinc-900">
                  {hipIn != null ? `${hipIn} นิ้ว` : "—"}
                </span>
              </li>
              <li className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3 text-sm">
                <span className="text-zinc-500">รอบอก</span>
                <span className="font-medium text-zinc-900">
                  {chestIn != null ? `${chestIn} นิ้ว` : "—"}
                </span>
              </li>
            </ul>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setConfirmKeep(false)}
                disabled={saving}
                className="flex h-14 flex-1 items-center justify-center rounded-full border border-zinc-300 text-base font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                แก้ไขใหม่
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmKeep(false);
                  void submitSaved({
                    waistIn: waistIn!,
                    hipIn: hipIn!,
                    chestIn: chestIn!,
                  });
                }}
                disabled={saving}
                className="flex h-14 flex-1 items-center justify-center rounded-full bg-[#18A659] px-5 text-base font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกค่าเดิม"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
