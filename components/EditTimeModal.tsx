"use client";

import Modal from "@/components/Modal";
import TimeColumnPicker from "@/components/TimeColumnPicker";

type Phase = "fasting" | "eating";

interface EditTimeModalProps {
  /** วันที่เริ่ม phase (ไทย) — ล็อกไว้ เปลี่ยนไม่ได้, แก้ได้แค่เวลา. */
  dateValue: string;
  /** The "HH:mm" time of the phase start (in Thai/ICT wall-clock). */
  timeValue: string;
  mode: Phase;
  onTimeChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  /** คำเตือนก่อนบันทึก เช่น การอดจะถูกบันทึกสั้นลงจนไม่ถึงเป้า. */
  warning: string | null;
}

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base font-bold tracking-wider outline-none transition-colors focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30";

const pad2 = (value: number) => String(value).padStart(2, "0");

const HOURS = { min: 0, max: 23 };
const MINUTES = { min: 0, max: 59 };

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

/** Edits the start time of the current phase, for when the user forgot to
 *  press start on time. The date is locked to the phase's actual start day —
 *  only the clock time is editable, so a past day can never be picked by
 *  mistake. Interpreted as Thai (ICT) wall-clock, matching the timer screen. */
export default function EditTimeModal({
  dateValue,
  timeValue,
  mode,
  onTimeChange,
  onSave,
  onClose,
  loading,
  error,
  warning,
}: EditTimeModalProps) {
  const isFasting = mode === "fasting";
  // เปิดให้แก้เวลาได้เฉพาะ phase อด — ช่วงกินยังไม่ให้แก้ (เวลาเริ่มกิน
  // กำหนดตอนกด "สิ้นสุดการอด" แล้ว, แก้แล้วจะไปหดระยะอดโดยไม่รู้ตัว).
  const timeDisabled = !isFasting;

  const timeParts = timeValue.split(":");
  const hourValue = Number(timeParts[0] ?? 0);
  const minuteValue = Number(timeParts[1] ?? 0);

  function setHour(hour: number) {
    onTimeChange(`${pad2(hour)}:${pad2(minuteValue)}`);
  }

  function setMinute(minute: number) {
    onTimeChange(`${pad2(hourValue)}:${pad2(minute)}`);
  }

  return (
    <Modal ariaLabel="แก้ไขเวลา" onClose={onClose}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isFasting ? "bg-[#DC8426]/10 text-[#DC8426]" : "bg-[#18A659]/10 text-[#18A659]"
          }`}
        >
          <ClockIcon />
        </span>
        <div>
          <h2 className="text-lg font-bold text-zinc-900">
            {isFasting ? "แก้ไขเวลาอดอาหาร" : "แก้ไขเวลากิน"}
          </h2>
          <p className="text-sm text-zinc-500">
            {isFasting
              ? "ลืมกดเริ่มอด กดแล้วแก้เวลาย้อนหลังได้"
              : "ช่วงกินยังไม่เปิดให้แก้ไขเวลาได้"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label
            htmlFor="edit-time-date"
            className="mb-1 block text-sm font-medium text-zinc-700"
          >
            วันที่
          </label>
          <input
            id="edit-time-date"
            type="date"
            value={dateValue}
            disabled
            className={`${inputClass} cursor-not-allowed bg-zinc-50 text-zinc-500`}
          />
          <p className="mt-1 text-xs text-zinc-400">
            วันที่ตามที่เริ่มไว้ เปลี่ยนไม่ได้ — แก้ได้เฉพาะเวลา
          </p>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-zinc-700">
            เวลา 24 ชม.
          </span>
          <div className="flex items-center gap-2">
            <TimeColumnPicker
              label="ชั่วโมง"
              min={HOURS.min}
              max={HOURS.max}
              value={hourValue}
              disabled={timeDisabled}
              onChange={setHour}
              format={pad2}
            />
            <span aria-hidden="true" className="text-lg font-bold text-zinc-400">
              :
            </span>
            <TimeColumnPicker
              label="นาที"
              min={MINUTES.min}
              max={MINUTES.max}
              value={minuteValue}
              disabled={timeDisabled}
              onChange={setMinute}
              format={pad2}
            />
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {error}
        </p>
      )}
      {warning && (
        <p
          role="alert"
          className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700"
        >
          {warning}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={loading || timeDisabled}
          className="flex h-14 items-center justify-center rounded-full bg-[#18A659] px-6 text-base font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "กำลังบันทึก..." : "บันทึกเวลา"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex h-14 items-center justify-center rounded-full border border-zinc-300 px-6 text-base font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
        >
          ยกเลิก
        </button>
      </div>
    </Modal>
  );
}