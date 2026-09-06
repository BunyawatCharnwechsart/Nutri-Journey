"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export const QUARTER_OPTIONS = [
  { q: 1, label: "ม.ค.– มี.ค." },
  { q: 2, label: "เม.ย. – มิ.ย." },
  { q: 3, label: "ก.ค. – ก.ย." },
  { q: 4, label: "ต.ค. – ธ.ค." },
] as const;

interface QuarterSelectProps {
  quarter: number;
}

export default function QuarterSelect({ quarter }: QuarterSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const currentLabel = QUARTER_OPTIONS[quarter - 1]?.label ?? "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 outline-none transition-colors hover:bg-zinc-50 focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30"
      >
        <span>{currentLabel}</span>
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
        <ul
          role="menu"
          aria-label="เลือกช่วงเดือน"
          className="absolute right-0 top-full z-50 mt-2 min-w-[11rem] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl"
        >
          {QUARTER_OPTIONS.map(({ q, label }) => (
            <li key={q}>
              <Link
                href={`/stats?range=3m&q=${q}`}
                role="menuitem"
                aria-current={quarter === q ? "true" : undefined}
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  quarter === q
                    ? "bg-[#18A659] text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}