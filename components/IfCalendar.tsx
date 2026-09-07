"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  buildDayMoodMap,
  buildDayStatusMap,
  type CalendarDayStatus,
  type CalendarSessionInput,
} from "@/lib/calendar";
import { getMoodLevel } from "@/lib/if";

const DAYS_PER_ROW = 7;
const GRID_CELLS = 42;
const DAY_MS = 86_400_000;

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const WEEKDAY_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const STATUS_LABELS: Record<CalendarDayStatus | "none", string> = {
  success: "ทำ IF สำเร็จ",
  fail: "ไม่ถึงเป้าหมาย",
  active: "กำลังอดอาหาร",
  abandoned: "ไม่จบ (เริ่มใหม่)",
  none: "ไม่มีการทำ IF",
};

interface CalendarCell {
  date: Date;
  status: CalendarDayStatus | "none";
  isToday: boolean;
}

interface IfCalendarProps {
  /** "yyyy-MM" — เดือนที่เลือก (controlled by CalendarTab). */
  monthKey: string;
  /** "yyyy-MM-dd" (ICT) ของวันนี้ — ใช้ highlight วันที่เป็นวันนี้. */
  todayKey: string;
  /** sessions ของเดือนที่เลือก (fetch โดย CalendarTab). */
  sessions: CalendarSessionInput[];
  /** true ขณะกำลังโหลด session ของเดือนใหม่. */
  loading: boolean;
  /** เลื่อนเดือน ±1 (CalendarTab เป็นคนถือ state). */
  onMonthChange: (delta: number) => void;
}

function toICT(date: Date): Date {
  return new Date(date.getTime() + ICT_OFFSET_MS);
}

function toICTDateKey(date: Date): string {
  const ict = toICT(date);
  const y = ict.getUTCFullYear();
  const m = String(ict.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ict.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toICTMonthKey(date: Date): string {
  const ict = toICT(date);
  const y = ict.getUTCFullYear();
  const m = String(ict.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function IfCalendar({
  monthKey,
  todayKey,
  sessions,
  loading,
  onMonthChange,
}: IfCalendarProps) {
  const [year, month] = monthKey.split("-").map(Number);

  const statusByDay = useMemo(() => buildDayStatusMap(sessions), [sessions]);
  const moodByDay = useMemo(() => buildDayMoodMap(sessions), [sessions]);

  const rows = useMemo(() => {
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const firstDayOffset = monthStart.getUTCDay();
    const cells: CalendarCell[] = [];

    for (let i = 0; i < GRID_CELLS; i++) {
      const cellDate = new Date(
        monthStart.getTime() + (i - firstDayOffset) * DAY_MS
      );
      const key = toICTDateKey(cellDate);
      cells.push({
        date: cellDate,
        status: statusByDay.get(key) ?? "none",
        isToday: key === todayKey,
      });
    }

    const gridRows: CalendarCell[][] = [];
    for (let r = 0; r < GRID_CELLS / DAYS_PER_ROW; r++) {
      gridRows.push(cells.slice(r * DAYS_PER_ROW, (r + 1) * DAYS_PER_ROW));
    }
    return gridRows;
  }, [year, month, statusByDay, todayKey]);

  const ictNow = toICT(new Date());
  const minMonthKey = toICTMonthKey(
    new Date(Date.UTC(ictNow.getUTCFullYear(), ictNow.getUTCMonth() - 11, 1))
  );
  const currentMonthKey = toICTMonthKey(new Date());
  const isCurrentMonth = monthKey === currentMonthKey;
  const canGoBack = monthKey > minMonthKey;
  const monthLabel = `${THAI_MONTHS[month - 1]} ${year}`;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="mb-4 text-base font-semibold text-zinc-900">
        ปฏิทิน IF
      </h2>

      <div className="mb-4 flex items-center justify-between">
        {canGoBack ? (
          <button
            type="button"
            onClick={() => onMonthChange(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition-colors hover:bg-zinc-100"
            aria-label="เดือนก่อนหน้า"
          >
            ‹
          </button>
        ) : (
          <span className="h-9 w-9" />
        )}
        <h3 className="text-base font-semibold text-zinc-900">{monthLabel}</h3>
        {!isCurrentMonth ? (
          <button
            type="button"
            onClick={() => onMonthChange(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition-colors hover:bg-zinc-100"
            aria-label="เดือนถัดไป"
          >
            ›
          </button>
        ) : (
          <span className="h-9 w-9" />
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1" aria-busy="true">
          {Array.from({ length: GRID_CELLS }).map((_, index) => (
            <div
              key={index}
              className="aspect-square animate-pulse rounded-lg bg-zinc-100"
            />
          ))}
        </div>
      ) : (
        <div
          role="grid"
          aria-label={`ปฏิทิน ${monthLabel}`}
          className="flex flex-col gap-1"
        >
          <div role="row" className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day, index) => (
              <span
                key={day}
                role="columnheader"
                aria-label={WEEKDAY_FULL[index]}
                className="py-1 text-xs font-medium text-zinc-400"
              >
                {day}
              </span>
            ))}
          </div>
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} role="row" className="grid grid-cols-7 gap-1">
              {row.map((cell, colIndex) => {
                const key = toICTDateKey(cell.date);
                const inMonth = key.startsWith(String(monthKey));
                const dateLabel = `${cell.date.getUTCDate()} ${
                  THAI_MONTHS[cell.date.getUTCMonth()]
                } ${cell.date.getUTCFullYear()}`;
                const mood = moodByDay.get(key);
                const moodLevel = getMoodLevel(mood ?? null);

                return (
                  <div
                    key={colIndex}
                    role="gridcell"
                    aria-label={`${cell.isToday ? "วันนี้, " : ""}${dateLabel}, ${
                      STATUS_LABELS[cell.status]
                    }${moodLevel ? `, อารมณ์ ${moodLevel.labelThai}` : ""}`}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border ${
                      cell.status === "success"
                        ? "border-[#18A659] bg-[#18A659]/10"
                        : cell.status === "fail"
                          ? "border-[#FFAE00] bg-[#FFAE00]/10"
                          : cell.status === "active"
                            ? "border-[#62D4F0] bg-[#62D4F0]/10"
                            : "border-transparent"
                    } ${!inMonth ? "opacity-30" : ""}`}
                  >
                    {moodLevel && (
                      <span
                        aria-hidden="true"
                        title={moodLevel.labelThai}
                        className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full shadow-sm"
                      >
                        <Image
                          src={moodLevel.icon}
                          alt=""
                          width={16}
                          height={16}
                          className="h-full w-full rounded-full"
                        />
                      </span>
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        cell.isToday
                          ? "flex h-6 w-6 items-center justify-center rounded-full bg-[#18A659] text-white"
                          : "text-zinc-900"
                      }`}
                    >
                      {cell.date.getUTCDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-zinc-200 pt-4">
        <div className="flex flex-col items-start gap-2 text-sm text-zinc-500 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-[#18A659]/40" aria-hidden="true" />
            สำเร็จ (อดครบ + กินครบ)
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-[#FFAE00]/40" aria-hidden="true" />
            ไม่ถึงเป้าหมาย
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-[#62D4F0]/40" aria-hidden="true" />
            กำลังอดอาหาร
          </div>
        </div>
      </div>
    </section>
  );
}