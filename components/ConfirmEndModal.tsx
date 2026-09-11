"use client";

import Image from "next/image";

import Modal from "@/components/Modal";
import { MOOD_LEVELS, type MoodValue } from "@/lib/if";

interface ConfirmEndModalProps {
  /** How long the user has been eating, already formatted (e.g. "01:23:45"). */
  eatingElapsedText: string;
  selectedMood: MoodValue | null;
  onSelectMood: (mood: MoodValue) => void;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}

/** Confirms ending the eating phase and records the user's mood of the day. */
export default function ConfirmEndModal({
  eatingElapsedText,
  selectedMood,
  onSelectMood,
  onConfirm,
  onClose,
  loading,
  error,
}: ConfirmEndModalProps) {
  return (
    <Modal ariaLabel="ยืนยันสิ้นสุดการกิน" onClose={onClose}>
      <div>
        <h2 className="text-lg font-bold text-zinc-900">สิ้นสุดการกิน?</h2>
        <p className="mt-1 text-sm text-zinc-500">
          คุณได้กินอาหารมาแล้ว {eatingElapsedText} ต้องการบันทึกและสิ้นสุดหรือไม่?
        </p>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">
          วันนี้รู้สึกอย่างไร?
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          อารมณ์นี้จะถูกบันทึกไว้บนปฏิทิน (เลือกก่อนสิ้นสุด)
        </p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {MOOD_LEVELS.map((mood) => {
            const isSelected = selectedMood === mood.value;
            return (
              <button
                key={mood.value}
                type="button"
                onClick={() => onSelectMood(mood.value)}
                aria-pressed={isSelected}
                aria-label={mood.labelThai}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 transition-colors ${
                  isSelected
                    ? "border-[#18A659] bg-[#18A659]/10"
                    : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full"
                >
                  <Image
                    src={mood.icon}
                    alt=""
                    width={24}
                    height={24}
                    className="h-full w-full"
                  />
                </span>
                <span
                  className={`text-xs leading-tight ${
                    isSelected
                      ? "font-semibold text-[#18A659]"
                      : "font-medium text-zinc-600"
                  }`}
                >
                  {mood.labelThai}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="rounded-full bg-[#18A659] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:opacity-50"
        >
          {loading ? "กำลังบันทึก..." : "สิ้นสุดการกิน"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
        >
          ยังไม่สิ้นสุด
        </button>
      </div>
    </Modal>
  );
}