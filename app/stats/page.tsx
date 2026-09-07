import { redirect } from "next/navigation";
import Link from "next/link";

import { getSessionUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getICTCurrentQuarter,
  getQuarterWindow,
  getYearToDateWindow,
} from "@/lib/weight-log";
import { toICTDateKey, toICTMonthKey } from "@/lib/timezone";
import EggIconLink from "@/components/EggIconLink";
import IfCalendar from "@/components/IfCalendar";
import QuarterSelect, { QUARTER_OPTIONS } from "@/components/QuarterSelect";
import WeightChart, { type WeightPoint } from "@/components/WeightChart";

export const dynamic = "force-dynamic";

/** Chart ranges exposed as URL tabs: ปฏิทิน / 3 เดือน / 1 ปี. */
type Range = "calendar" | "3m" | "1y";

/** Whitelist-only parse: anything unknown falls back to the calendar view. */
function parseRange(value: string | string[] | undefined): Range {
  if (value === "calendar") {
    return "calendar";
  }
  return value === "1y" ? "1y" : "3m";
}

/** Whitelist-only parse: only 1..4 are valid, otherwise use the fallback. */
function parseQuarter(
  value: string | string[] | undefined,
  fallback: number
): number {
  const num = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(num) && num >= 1 && num <= 4 ? num : fallback;
}

/** Normalizes a weight_logs row to the shape the chart expects. */
function toWeightPoint(row: {
  id: string;
  recorded_on: unknown;
  weight_kg: unknown;
}): WeightPoint {
  const raw = row.recorded_on;
  const date =
    raw instanceof Date && !Number.isNaN(raw.getTime())
      ? raw.toISOString().slice(0, 10)
      : String(raw ?? "");

  return {
    id: row.id,
    date,
    weightKg: Number(row.weight_kg),
  };
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { range: rangeParam, q: qParam } = await searchParams;
  const range = parseRange(rangeParam);

  const now = new Date();
  const todayKey = toICTDateKey(now);
  const initialMonthKey = toICTMonthKey(now);
  const { year: currentYear, quarter: currentQuarter } =
    getICTCurrentQuarter(now.getTime());
  const quarter =
    range === "3m" ? parseQuarter(qParam, currentQuarter) : currentQuarter;
  const quarterLabel = QUARTER_OPTIONS[quarter - 1]?.label ?? "";

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  let subtitle: string;
  let logs: WeightPoint[] = [];
  let error: unknown = null;

  if (range === "calendar") {
    subtitle = "ประวัติการทำ IF ของคุณ";
  } else {
    const { fromKey, toKey } =
      range === "1y"
        ? getYearToDateWindow(now.getTime())
        : getQuarterWindow(currentYear, quarter);

    const supabase = createServiceClient();
    const { data: rows, error: weightError } = await supabase
      .from("weight_logs")
      .select("id, recorded_on, weight_kg")
      .eq("user_id", userId)
      .gte("recorded_on", fromKey)
      .lte("recorded_on", toKey)
      .order("recorded_on", { ascending: true });

    logs = (rows ?? []).map(toWeightPoint);
    error = weightError;

    subtitle =
      range === "1y"
        ? "กราฟน้ำหนักรายปี (ม.ค.–ปัจจุบัน)"
        : `กราฟน้ำหนัก ${quarterLabel}`;
  }

  const periodLabel =
    range === "3m" || range === "1y"
      ? range === "1y"
        ? "ปีนี้ (ม.ค.–ปัจจุบัน)"
        : quarterLabel
      : "";

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              สถิติ
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[#18A659]">
            <EggIconLink />
          </div>
        </header>

        <nav
          aria-label="ช่วงเวลา"
          className="flex overflow-hidden rounded-2xl border border-zinc-200 bg-white"
        >
          <Link
            href="/stats?range=calendar"
            aria-current={range === "calendar" ? "true" : undefined}
            className={`flex-1 border-b-[3px] px-3 pt-3 pb-2.5 text-center text-base font-semibold transition-colors ${
              range === "calendar"
                ? "border-[#18A659] text-[#18A659]"
                : "border-transparent text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
            }`}
          >
            ปฏิทิน
          </Link>
          <Link
            href="/stats?range=3m"
            aria-current={range === "3m" ? "true" : undefined}
            className={`flex-1 border-b-[3px] px-3 pt-3 pb-2.5 text-center text-base font-semibold transition-colors ${
              range === "3m"
                ? "border-[#18A659] text-[#18A659]"
                : "border-transparent text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
            }`}
          >
            3 เดือน
          </Link>
          <Link
            href="/stats?range=1y"
            aria-current={range === "1y" ? "true" : undefined}
            className={`flex-1 border-b-[3px] px-3 pt-3 pb-2.5 text-center text-base font-semibold transition-colors ${
              range === "1y"
                ? "border-[#18A659] text-[#18A659]"
                : "border-transparent text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
            }`}
          >
            1 ปี
          </Link>
        </nav>

        {range === "calendar" ? (
          <IfCalendar initialMonthKey={initialMonthKey} todayKey={todayKey} />
        ) : (
          <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  น้ำหนัก
                </h2>
                {logs.length > 0 && (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {logs.length} จุดบันทึก
                  </p>
                )}
              </div>
              {range === "3m" && <QuarterSelect quarter={quarter} />}
            </div>

            {error ? (
              <p className="py-10 text-center text-sm text-red-600">
                ไม่สามารถโหลดข้อมูลน้ำหนักได้ โปรดลองใหม่ภายหลัง
              </p>
            ) : (
              <WeightChart
                logs={logs}
                range={range}
                periodLabel={periodLabel}
              />
            )}
          </section>
        )}
      </div>
    </main>
  );
}