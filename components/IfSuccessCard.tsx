"use client";

import {
  ArcElement,
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

import {
  countMonthStatus,
  countMonthSuccess,
  daysInMonth,
  type CalendarSessionInput,
} from "@/lib/calendar";

// Register Chart.js pieces once per app instance (canvas-based, no re-render).
ChartJS.register(ArcElement);

const BRAND_GREEN = "#18A659";
const FAIL_RED = "#EF4444";
const NOT_DONE_GRAY = "#e4e4e7";

interface IfSuccessCardProps {
  /** "yyyy-MM" — เดือนที่กำลังดูในปฏิทิน. */
  monthKey: string;
  /** sessions ของเดือนนั้น (ได้จาก API แล้วใน CalendarTab). */
  sessions: CalendarSessionInput[];
  /** true ขณะโหลดเดือนใหม่ — โชว์ skeleton แทนเลขที่ยังไม่ชัวร์. */
  loading?: boolean;
}

/**
 * Summary card "ความสำเร็จ" สำหรับแท็บปฏิทิน:
 * - ซ้าย: จำนวนวันที่ทำ IF สำเร็จเทียบกับจำนวนวันจริงของเดือน.
 * - ขวา: doughnut chart แบ่ง 3 ส่วนของเดือนที่กำลังดู
 *   เขียว = วันที่ทำสำเร็จ, แดง = วันที่ทำไม่สำเร็จ, เทา = วันที่ยังไม่ได้ทำ.
 * เดือนที่ยังไม่มีบันทึกเลย จะโชว์ "ยังไม่มีข้อมูล" แทน % ที่เข้าใจผิดได้.
 */
export default function IfSuccessCard({
  monthKey,
  sessions,
  loading = false,
}: IfSuccessCardProps) {
  const [year, month] = monthKey.split("-").map(Number);
  const totalDays = Number.isInteger(year) && Number.isInteger(month)
    ? daysInMonth(year, month)
    : 0;
  const successDays = countMonthSuccess(sessions, monthKey);
  const failDays = countMonthStatus(sessions, monthKey, "fail");
  const notDoneDays = Math.max(totalDays - successDays - failDays, 0);
  const hasData = sessions.length > 0;
  const successPercent =
    totalDays > 0 ? Math.round((successDays / totalDays) * 100) : 0;
  const failPercent =
    hasData && totalDays > 0 ? Math.round((failDays / totalDays) * 100) : 0;
  const notDonePercent =
    hasData && totalDays > 0 ? Math.round((notDoneDays / totalDays) * 100) : 0;

  const data: ChartData<"doughnut"> = {
    labels: ["สำเร็จ", "ไม่สำเร็จ", "ยังไม่ได้ทำ"],
    datasets: [
      {
        data: hasData
          ? [successDays, failDays, notDoneDays]
          : [0, 0, 1],
        backgroundColor: [BRAND_GREEN, FAIL_RED, NOT_DONE_GRAY],
        borderWidth: 0,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
      {loading ? (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2" aria-busy="true">
              <div className="h-4 w-20 animate-pulse rounded bg-zinc-100" />
              <div className="h-8 w-32 animate-pulse rounded bg-zinc-100" />
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
            </div>
            <div className="h-32 w-32 shrink-0 animate-pulse rounded-full bg-zinc-100" />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div>
            <h2 className="text-base font-semibold text-zinc-900">ความสำเร็จ</h2>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-[#18A659]">
                {hasData ? successDays : 0}
              </span>
              <span className="text-sm text-zinc-500">วัน</span>
            </div>
            <p className="text-sm text-zinc-500">จากทั้งหมด {totalDays} วัน</p>
            {!hasData && (
              <p className="mt-2 text-xs text-amber-600">เดือนนี้ยังไม่มีบันทึก IF</p>
            )}
          </div>

          <div
            role="img"
            aria-label={
              hasData
                ? `อัตราสำเร็จ ${successPercent}% (สำเร็จ ${successDays} วัน, ไม่สำเร็จ ${failDays} วัน, ยังไม่ได้ทำ ${notDoneDays} วัน)`
                : "ยังไม่มีข้อมูลในเดือนนี้"
            }
            className="relative h-32 w-32 shrink-0"
          >
            <Doughnut data={data} options={options} />
            {hasData ? (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-[#18A659]">
                  {successPercent}%
                </span>
                <span className="text-[10px] text-zinc-400">สำเร็จ</span>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-zinc-900">–</span>
                <span className="text-[10px] text-zinc-400">สำเร็จ</span>
              </div>
            )}
          </div>
          </div>

          {hasData && (
            <div className="flex items-center justify-end gap-4 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" aria-hidden="true" />
                ไม่สำเร็จ {failPercent}%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#e4e4e7]" aria-hidden="true" />
                ยังไม่ได้ทำ {notDonePercent}%
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}