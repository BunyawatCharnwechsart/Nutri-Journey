import { redirect } from "next/navigation";
import Link from "next/link";

import { getSessionUserId } from "@/lib/auth";
import { awardMission } from "@/lib/healthy-journey-service";
import { createServiceClient } from "@/lib/supabase/service";
import { getYearToDateWindow } from "@/lib/weight-log";
import { getICTYear, toICTDateKey, toICTMonthKey } from "@/lib/timezone";
import EggIconLink from "@/components/EggIconLink";
import CalendarTab from "@/components/CalendarTab";
import WeightChart, { type WeightPoint } from "@/components/WeightChart";

export const dynamic = "force-dynamic";

/** Chart ranges exposed as URL tabs: ปฏิทิน / 1 ปี. */
type Range = "calendar" | "1y";

/** Whitelist-only parse: anything unknown falls back to the 1-year chart. */
function parseRange(value: string | string[] | undefined): Range {
  return value === "calendar" ? "calendar" : "1y";
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
  const { range: rangeParam } = await searchParams;
  const range = parseRange(rangeParam);

  const now = new Date();
  const todayKey = toICTDateKey(now);
  const initialMonthKey = toICTMonthKey(now);
  const currentYear = getICTYear(now);

  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  // Daily mission: visiting the stats page. Idempotent per ICT day so
  // re-refreshing or switching tabs can never farm extra XP.
  await awardMission(userId, "view_stats");

  let subtitle: string;
  let logs: WeightPoint[] = [];
  let error: unknown = null;

  if (range === "calendar") {
    subtitle = "ประวัติการทำ IF ของคุณ";
  } else {
    const { fromKey, toKey } = getYearToDateWindow(now.getTime());

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

    subtitle = `กราฟน้ำหนักรายปี (ปี ${currentYear})`;
  }

  const periodLabel = range === "1y" ? `ปี ${currentYear}` : "";

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
          <CalendarTab initialMonthKey={initialMonthKey} todayKey={todayKey} />
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
            </div>

            {error ? (
              <p className="py-10 text-center text-sm text-red-600">
                ไม่สามารถโหลดข้อมูลน้ำหนักได้ โปรดลองใหม่ภายหลัง
              </p>
            ) : (
              <WeightChart logs={logs} periodLabel={periodLabel} />
            )}
          </section>
        )}
      </div>
    </main>
  );
}