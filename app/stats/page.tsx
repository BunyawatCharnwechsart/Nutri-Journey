import { redirect } from "next/navigation";

import { getSessionUserId } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getRecentWeightLogWindow } from "@/lib/weight-log";
import EggIconLink from "@/components/EggIconLink";
import WeightChart, { type WeightPoint } from "@/components/WeightChart";

export const dynamic = "force-dynamic";

/** How many calendar months of history the stats chart shows. */
const HISTORY_MONTHS = 3;

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

export default async function StatsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const { fromKey, toKey } = getRecentWeightLogWindow(
    new Date().getTime(),
    HISTORY_MONTHS
  );

  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("weight_logs")
    .select("id, recorded_on, weight_kg")
    .eq("user_id", userId)
    .gte("recorded_on", fromKey)
    .lte("recorded_on", toKey)
    .order("recorded_on", { ascending: true });

  const logs: WeightPoint[] = (rows ?? []).map(toWeightPoint);

  return (
    <main className="flex flex-1 flex-col px-6 pt-6 pb-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              สถิติ
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              กราฟน้ำหนักย้อนหลัง {HISTORY_MONTHS} เดือน
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[#18A659]">
            <EggIconLink />
          </div>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-zinc-900">น้ำหนัก</h2>
            {logs.length > 0 && (
              <span className="text-xs text-zinc-500">
                {logs.length} จุดบันทึก
              </span>
            )}
          </div>

          {error ? (
            <p className="py-10 text-center text-sm text-red-600">
              ไม่สามารถโหลดข้อมูลน้ำหนักได้ โปรดลองใหม่ภายหลัง
            </p>
          ) : (
            <WeightChart logs={logs} />
          )}
        </section>
      </div>
    </main>
  );
}