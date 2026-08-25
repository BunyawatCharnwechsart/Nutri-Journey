import { redirect } from "next/navigation";
import Link from "next/link";
import {
  addMonths,
  endOfMonth,
  format,
  getDay,
  isAfter,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import { th } from "date-fns/locale/th";

import { getSessionUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { formatMinutes, getFastingMinutes } from "@/lib/if";
import EggIconLink from "@/components/EggIconLink";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

interface DayStatus {
  date: Date;
  status: "success" | "fail" | "none" | "active";
  durationMinutes: number;
  isToday: boolean;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const { month } = await searchParams;
  const today = new Date();

  // Default to the current month; only allow months in the past (or now).
  let currentMonth: Date;
  if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
    const [year, monthIndex] = month.split("-").map(Number);
    currentMonth = new Date(year, monthIndex - 1, 1);
    if (isAfter(currentMonth, startOfMonth(today))) {
      currentMonth = startOfMonth(today);
    }
  } else {
    currentMonth = startOfMonth(today);
  }

  const supabase = createServiceClient();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: sessions } = await supabase
    .from("if_sessions")
    .select(
      "fasting_start_time, fasting_end_time, status, fasting_duration_minutes, if_pattern"
    )
    .eq("user_id", userId)
    .gte("fasting_start_time", monthStart.toISOString())
    .lte("fasting_start_time", monthEnd.toISOString())
    .order("fasting_start_time", { ascending: true });

  // Group completed sessions by their local calendar day.
  const byDay = new Map<string, DayStatus>();
  for (const session of sessions ?? []) {
    const date = new Date(session.fasting_start_time);
    const key = format(date, "yyyy-MM-dd");

    const planned = getFastingMinutes(session.if_pattern);
    const duration = session.fasting_duration_minutes ?? 0;

    const existing = byDay.get(key);
    const candidate: DayStatus = {
      date,
      // "abandoned" = auto-closed because the user started a new session
      // without ending this one — never counts as a success.
      status:
        session.status === "active"
          ? "active"
          : session.status === "completed" && duration >= planned
            ? "success"
            : "fail",
      durationMinutes: Math.max(duration, existing?.durationMinutes ?? 0),
      isToday: isToday(date),
    };

    // An active session takes priority over any completed one that day.
    if (
      !existing ||
      candidate.status === "active" ||
      (candidate.status === "success" && existing.status === "fail")
    ) {
      byDay.set(key, candidate);
    }
  }

  // Build the calendar grid (42 cells, starts on the weekday of day 1).
  const firstDayOffset = getDay(monthStart);
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - firstDayOffset);

  const cells: DayStatus[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const key = format(date, "yyyy-MM-dd");
    const day =
      byDay.get(key) ??
      ({ date, status: "none", durationMinutes: 0, isToday: isToday(date) } satisfies DayStatus);
    cells.push(day);
  }

  const prevMonth = subMonths(currentMonth, 1);
  const canGoBack = isAfter(monthStart, addMonths(startOfMonth(today), -12));
  const nextMonth = addMonths(currentMonth, 1);
  const isCurrentMonth = isSameMonth(currentMonth, today);

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              ปฏิทิน IF
            </h1>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              ประวัติการทำ IF ของคุณ
            </p>
          </div>
          <EggIconLink />
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            {canGoBack ? (
              <Link
                href={`/calendar?month=${format(prevMonth, "yyyy-MM")}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition-colors hover:bg-zinc-100"
                aria-label="เดือนก่อนหน้า"
              >
                ‹
              </Link>
            ) : (
              <span className="h-9 w-9" />
            )}
            <h2 className="text-base font-semibold text-zinc-900">
              {format(currentMonth, "LLLL yyyy", { locale: th })}
            </h2>
            {!isCurrentMonth ? (
              <Link
                href={`/calendar?month=${format(nextMonth, "yyyy-MM")}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition-colors hover:bg-zinc-100"
                aria-label="เดือนถัดไป"
              >
                ›
              </Link>
            ) : (
              <span className="h-9 w-9" />
            )}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="py-1 text-xs font-medium text-zinc-400"
              >
                {day}
              </span>
            ))}
            {cells.map((cell, index) => {
              const inMonth = isSameMonth(cell.date, currentMonth);
              return (
                <div
                  key={index}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg border ${
                    cell.status === "success"
                      ? "border-[#18A659] bg-[#18A659]/10"
                      : cell.status === "fail"
                        ? "border-[#FFAE00] bg-[#FFAE00]/10"
                        : cell.status === "active"
                          ? "border-[#62D4F0] bg-[#62D4F0]/10"
                          : "border-transparent"
                  } ${!inMonth ? "opacity-30" : ""}`}
                >
                  <span
                    className={`text-sm font-semibold ${
                      cell.isToday
                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-[#18A659] text-white"
                        : "text-zinc-900"
                    }`}
                  >
                    {format(cell.date, "d")}
                  </span>
                  {cell.status !== "none" && cell.durationMinutes > 0 && (
                    <span className="mt-0.5 text-[10px] font-medium text-zinc-500">
                      {formatMinutes(cell.durationMinutes)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col gap-2 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-[#18A659]/40" />
            สำเร็จ (ทำครบเป้าหมาย)
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-[#FFAE00]/40" />
            ไม่ถึงเป้าหมาย
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-[#62D4F0]/40" />
            กำลังอดอาหาร
          </div>
        </div>
      </div>
    </main>
  );
}