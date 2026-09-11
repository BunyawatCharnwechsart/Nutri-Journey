"use client";

import Modal from "@/components/Modal";

type Phase = "fasting" | "eating";

interface EditTimeModalProps {
  /** The "HH:MM" value in the time input, e.g. "14:30". */
  value: string;
  mode: Phase;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}

/** Edits the start time of the current phase, for when the user forgot to
 *  press start on time. */
export default function EditTimeModal({
  value,
  mode,
  onChange,
  onSave,
  onClose,
  loading,
  error,
}: EditTimeModalProps) {
  return (
    <Modal ariaLabel="แก้ไขเวลา" onClose={onClose}>
      <div>
        <h2 className="text-lg font-bold text-zinc-900">
          {mode === "fasting" ? "แก้ไขเวลาอดอาหาร" : "แก้ไขเวลากิน"}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {mode === "fasting"
            ? "ใช้สำหรับกรณีที่ลืมกดเริ่มอดอาหาร"
            : "ใช้สำหรับกรณีที่ลืมกดกินอาหาร"}
        </p>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-center">
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-2xl font-bold tracking-wider text-center outline-none focus:border-[#18A659] focus:ring-1 focus:ring-[#18A659]"
        />
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="rounded-full bg-[#18A659] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:opacity-50"
        >
          {loading ? "กำลังบันทึก..." : "บันทึกเวลา"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
        >
          ยกเลิก
        </button>
      </div>
    </Modal>
  );
}