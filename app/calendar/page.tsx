import { redirect } from "next/navigation";
import Link from "next/link";

import { getSessionUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getEatingMinutes, getFastingMinutes } from "@/lib/if";
import {
  getICTMonthBounds,
  toICT,
  toICTDateKey,
  toICTMonthKey,
} from "@/lib/timezone";
import EggIconLink from "@/components/EggIconLink";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
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

// ไทยใช้ ICT แบบคงที่ UTC+7 ไม่มี DST → การเลื่อนวันละ 24 ชม. ปลอดภัยเสมอ.
const DAY_MS = 86_400_000;
const GRID_CELLS = 42;

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
  const ictNow = toICT(new Date());
  const todayKey = toICTDateKey(new Date());

  // `currentMonth` คือ Date ที่สร้างด้วย Date.UTC → ค่า UTC components
  // คือวัน/เดือนตามผนังแบบไทยพอดี หน้าเพจจึงอ่านด้วย getUTC* เสมอ
  // (ไม่พึ่ง timezone ของเครื่อง server ซึ่งต่างกันระหว่าง dev กับ Vercel)
  const currentNowMonthStart = new Date(
    Date.UTC(ictNow.getUTCFullYear(), ictNow.getUTCMonth(), 1)
  );

  let currentMonth: Date;
  if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
    const [year, monthIndex] = month.split("-").map(Number);
    currentMonth = new Date(Date.UTC(year, monthIndex - 1, 1));
    if (currentMonth.getTime() > currentNowMonthStart.getTime()) {
      currentMonth = currentNowMonthStart;
    }
  } else {
    currentMonth = currentNowMonthStart;
  }

  const currentMonthKey = toICTMonthKey(currentMonth);

  const supabase = createServiceClient();
  const bounds = getICTMonthBounds(
    currentMonth.getUTCFullYear(),
    currentMonth.getUTCMonth() + 1
  );

  const { data: sessions } = await supabase
    .from("if_sessions")
    .select(
      "fasting_start_time, fasting_end_time, status, fasting_duration_minutes, eating_duration_minutes, if_pattern"
    )
    .eq("user_id", userId)
    .gte("fasting_start_time", bounds.startIso)
    .lt("fasting_start_time", bounds.endIso)
    .order("fasting_start_time", { ascending: true });

  // จัดกลุ่ม session ตามวัน (แบบไทย) ที่การอดเริ่มต้น.
  const byDay = new Map<string, DayStatus>();
  for (const session of sessions ?? []) {
    const key = toICTDateKey(new Date(session.fasting_start_time));

    // Success ต้องทำได้ครบทั้ง 2 เป้า: ทั้งช่วงอดถึงเป้า (เช่น 16 ชม. สำหรับ 16:8)
    // และช่วงกินถึงเป้า (เช่น 8 ชม.); ได้ไม่ครบอย่างใดอย่างหนึ่งถือเป็น "fail".
    const plannedFasting = getFastingMinutes(session.if_pattern);
    const plannedEating = getEatingMinutes(session.if_pattern);
    const fastingDuration = session.fasting_duration_minutes ?? 0;
    const eatingDuration = session.eating_duration_minutes ?? 0;

    const existing = byDay.get(key);
    const candidate: DayStatus = {
      date: new Date(session.fasting_start_time),
      // "abandoned" = ถูกปิดอัตโนมัติเพราะผู้ใช้เริ่ม session ใหม่โดยไม่จบ session
      // นี้ — ไม่นับเป็นความสำเร็จ.
      status:
        session.status === "active"
          ? "active"
          : session.status === "completed" &&
              fastingDuration >= plannedFasting &&
              eatingDuration >= plannedEating
            ? "success"
            : "fail",
      durationMinutes: Math.max(
        fastingDuration,
        existing?.durationMinutes ?? 0
      ),
      isToday: key === todayKey,
    };

    // session ที่กำลังอดอยู่ชนะ session ที่จบไปแล้วในวันเดียวกัน.
    if (
      !existing ||
      candidate.status === "active" ||
      (candidate.status === "success" && existing.status === "fail")
    ) {
      byDay.set(key, candidate);
    }
  }

  // สร้าง grid 42 ช่อง เริ่มจากวันในสัปดาห์ของวันที่ 1 (แบบไทย).
  const firstDayOffset = currentMonth.getUTCDay();
  const gridStart = currentMonth.getTime();
  const cells: DayStatus[] = [];
  for (let i = 0; i < GRID_CELLS; i++) {
    const cellDate = new Date(gridStart + (i - firstDayOffset) * DAY_MS);
    const key = toICTDateKey(cellDate);
    const day =
      byDay.get(key) ??
      ({
        date: cellDate,
        status: "none",
        durationMinutes: 0,
        isToday: key === todayKey,
      } satisfies DayStatus);
    cells.push(day);
  }

  const prevMonth = new Date(
    Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - 1, 1)
  );
  const nextMonth = new Date(
    Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + 1, 1)
  );
  const canGoBack =
    currentMonth.getTime() >
    new Date(
      Date.UTC(ictNow.getUTCFullYear(), ictNow.getUTCMonth() - 11, 1)
    ).getTime();
  const isCurrentMonth =
    currentMonthKey === toICTMonthKey(currentNowMonthStart);

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
                href={`/calendar?month=${toICTMonthKey(prevMonth)}`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-700 transition-colors hover:bg-zinc-100"
                aria-label="เดือนก่อนหน้า"
              >
                ‹
              </Link>
            ) : (
              <span className="h-9 w-9" />
            )}
            <h2 className="text-base font-semibold text-zinc-900">
              {THAI_MONTHS[currentMonth.getUTCMonth()]}{" "}
              {currentMonth.getUTCFullYear()}
            </h2>
            {!isCurrentMonth ? (
              <Link
                href={`/calendar?month=${toICTMonthKey(nextMonth)}`}
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
              const inMonth = toICTDateKey(cell.date).startsWith(
                currentMonthKey
              );
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
                    {cell.date.getUTCDate()}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-zinc-200 pt-4">
            <div className="flex flex-col items-start gap-2 text-sm text-zinc-500 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-[#18A659]/40" />
                สำเร็จ (อดครบ + กินครบ)
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
        </section>
      </div>
    </main>
  );
}