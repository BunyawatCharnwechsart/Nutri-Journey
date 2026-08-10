"use client";

import { useEffect, useRef, useState } from "react";
import { format, parse } from "date-fns";
import { DayPicker } from "react-day-picker";
import { th } from "react-day-picker/locale";

interface BirthDatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

const today = new Date();

function formatThai(date: Date | undefined): string {
  return date ? format(date, "d MMMM yyyy", { locale: th }) : "";
}

export default function BirthDatePicker({ value, onChange }: BirthDatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm text-zinc-900 outline-none transition-colors focus:border-[#06C755] focus:ring-2 focus:ring-[#06C755]/30 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
      >
        <span className={selectedDate ? "" : "text-zinc-400 dark:text-zinc-500"}>
          {selectedDate ? formatThai(selectedDate) : "เลือกวันเกิดของคุณ"}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="เลือกวันเกิด"
          className="absolute left-0 top-full z-50 mt-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        >
          <DayPicker
            mode="single"
            required
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onChange(format(date, "yyyy-MM-dd"));
              }
              setOpen(false);
            }}
            locale={th}
            disabled={{ after: today }}
            defaultMonth={selectedDate ?? today}
            weekStartsOn={1}
          />
        </div>
      )}
    </div>
  );
}