"use client";

import Modal from "@/components/Modal";
import { IF_PATTERNS } from "@/lib/if";

const PRIMARY_GRADIENT = {
  background: "linear-gradient(135deg, #18A659 0%, #26BA6A 100%)",
} as const;

interface PatternPickerModalProps {
  /** The currently highlighted pattern, or null when nothing is picked yet. */
  value: string | null;
  disabled?: boolean;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

/** Lets the user pick one of the supported IF patterns before starting. */
export default function PatternPickerModal({
  value,
  disabled = false,
  onChange,
  onConfirm,
  onClose,
}: PatternPickerModalProps) {
  return (
    <Modal ariaLabel="เลือกรูปแบบ IF" onClose={onClose}>
      <div>
        <h2 className="text-lg font-bold text-zinc-900">เลือกรูปแบบ IF</h2>
        <p className="mt-1 text-sm text-zinc-500">
          เลือกแล้วกดบันทึกเพื่อยืนยัน
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {IF_PATTERNS.map((pattern) => {
          const isSelected = value === pattern.value;
          return (
            <button
              key={pattern.value}
              type="button"
              onClick={() => onChange(pattern.value)}
              aria-pressed={isSelected}
              className={`flex flex-col gap-1 rounded-xl bg-white px-4 py-3 text-left text-black ${
                isSelected
                  ? "ring-2 ring-[#000000] ring-offset-2"
                  : "border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <span className="text-lg font-bold">{pattern.label}</span>
              <span className="text-sm text-black">{pattern.description}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={!value || disabled}
        onClick={onConfirm}
        className="rounded-xl px-6 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        style={PRIMARY_GRADIENT}
      >
        บันทึกรูปแบบ IF
      </button>
    </Modal>
  );
}