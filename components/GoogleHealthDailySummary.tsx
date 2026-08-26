"use client";

import { useEffect, useState } from "react";

interface DailyMetrics {
  date: string;
  steps: number;
  distance_meters: number;
  kcal: number;
}

interface Props {
  refreshKey?: number;
}

export default function GoogleHealthDailySummary({ refreshKey }: Props) {
  const [data, setData] = useState<DailyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const today = new Date();
        const from = new Date(today);
        from.setDate(today.getDate() - 6);
        const fromStr = from.toISOString().slice(0, 10);
        const toStr = today.toISOString().slice(0, 10);

        const res = await fetch(
          `/api/v1/google-health/daily?from=${fromStr}&to=${toStr}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as {
          success?: boolean;
          data?: { daily?: DailyMetrics[] };
          error?: { message?: string };
        };

        if (cancelled) return;

        if (!res.ok || !json.success) {
          setError(json.error?.message ?? "ไม่สามารถโหลดข้อมูลได้");
          return;
        }

        setData(json.data?.daily ?? []);
      } catch {
        if (!cancelled) {
          setError("เกิดข้อผิดพลาด ลองอีกครั้ง");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-[#18A659]" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
        {error}
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-400 py-6">
        ยังไม่มีข้อมูล กดซิงค์ข้อมูลด้านบนเพื่อดึงข้อมูลจาก Google Health
      </p>
    );
  }

  const totalSteps = data.reduce((sum, d) => sum + d.steps, 0);
  const totalDistance = data.reduce((sum, d) => sum + d.distance_meters, 0);
  const totalKcal = data.reduce((sum, d) => sum + d.kcal, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="ก้าวเดิน"
          value={totalSteps.toLocaleString()}
          unit="ก้าว"
          color="#18A659"
        />
        <StatCard
          label="ระยะทาง"
          value={totalDistance.toFixed(1)}
          unit="เมตร"
          color="#4285F4"
        />
        <StatCard
          label="แคลอรี่"
          value={totalKcal.toFixed(0)}
          unit="kcal"
          color="#EA4335"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-400">
              <th className="px-3 py-2 font-medium">วันที่</th>
              <th className="px-3 py-2 text-right font-medium">ก้าวเดิน</th>
              <th className="px-3 py-2 text-right font-medium">ระยะทาง</th>
              <th className="px-3 py-2 text-right font-medium">kcal</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.date} className="border-b border-zinc-100">
                <td className="px-3 py-2 text-zinc-700">{formatDate(row.date)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900">
                  {row.steps.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900">
                  {row.distance_meters.toFixed(0)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900">
                  {row.kcal.toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div
      className="flex flex-col items-center rounded-xl p-3 text-center"
      style={{ backgroundColor: `${color}10` }}
    >
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-lg font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="text-[10px] text-zinc-400">{unit}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  return `${day}/${month}`;
}
