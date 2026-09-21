"use client";

import { useMemo } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import { MOOD_LEVELS, getMoodLevel } from "@/lib/if";
import {
  buildDayMoodMap,
  type CalendarSessionInput,
} from "@/lib/calendar";

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip
);

/** เงาอ่อนใต้แท่ง (Chart.js ไม่มี shadow option ในตัว → plugin วาดเอง). */
const barShadow = {
  id: "barShadow",
  beforeDatasetDraw: (chart: { ctx: CanvasRenderingContext2D }) => {
    const { ctx } = chart;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
  },
  afterDatasetDraw: (chart: { ctx: CanvasRenderingContext2D }) => {
    chart.ctx.restore();
  },
};

/** สีตามระดับอารมณ์ ดึงจาก fill วงกลมของ emoji จริงใน public/icon/*Icon.svg. */
const MOOD_COLORS: Record<string, string> = {
  very_bad: "#E4514A",
  bad: "#FE7348",
  medium: "#F2A726",
  good: "#F1E021",
  very_good: "#88DE25",
};

interface MoodBarChartProps {
  sessions: CalendarSessionInput[];
  loading: boolean;
}

/**
 * กราฟแท่งแนวนอนแสดงการแจกแจงอารมณ์ในเดือนที่เลือกของปฏิทิน.
 *
 * นับ "1 วัน = 1 อารมณ์" ผ่าน buildDayMoodMap (logic เดียวกับ badge ในปฏิทิน)
 * เพื่อให้กราฟตรงกับสิ่งที่ badge รายวันแสดง. ใช้ข้อมูล `sessions` ที่แท็บ
 * ปฏิทิน fetch ไว้แล้ว — ไม่ต้องเพิ่ม query/API ใหม่.
 */
export default function MoodBarChart({
  sessions,
  loading,
}: MoodBarChartProps) {
  const counts = useMemo(() => {
    const result: Record<string, number> = {
      very_bad: 0,
      bad: 0,
      medium: 0,
      good: 0,
      very_good: 0,
    };
    for (const mood of buildDayMoodMap(sessions).values()) {
      const level = getMoodLevel(mood);
      if (level) {
        result[level.key] += 1;
      }
    }
    return result;
  }, [sessions]);

  const hasMood =
    Object.values(counts).reduce((sum, count) => sum + count, 0) > 0;

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const data: ChartData<"bar"> = {
    labels: MOOD_LEVELS.map((level) => level.labelThai),
    datasets: [
      {
        label: "วัน",
        data: MOOD_LEVELS.map((level) => counts[level.key]),
        backgroundColor: MOOD_LEVELS.map((level) => MOOD_COLORS[level.key]),
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 18,
        maxBarThickness: 22,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      tooltip: {
        titleColor: "#18181b",
        bodyColor: "#3f3f46",
        backgroundColor: "#ffffff",
        borderColor: "#e4e4e7",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (item) => `${(item.parsed.x as number)} วัน`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        suggestedMax: Math.max(1, Math.ceil(total / 5) * 5),
        ticks: {
          color: "#71717a",
          precision: 0,
          font: { size: 11 },
        },
        grid: { color: "rgba(0, 0, 0, 0.05)" },
      },
      y: {
        ticks: { color: "#3f3f46", font: { size: 12 } },
        grid: { display: false },
      },
    },
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-zinc-900">
          อารมณ์รายเดือน
        </h2>
        {!loading && hasMood && (
          <span className="text-xs text-zinc-500">{total} วันบันทึกอารมณ์</span>
        )}
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-zinc-400">
          กำลังโหลดอารมณ์...
        </p>
      ) : hasMood ? (
        <div
          role="img"
          aria-label="กราฟแสดงจำนวนวันของแต่ละระดับอารมณ์ในเดือนนี้"
          className="h-48 w-full"
        >
          <Bar data={data} options={options} plugins={[barShadow]} />
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-zinc-500">
          เดือนนี้ยังไม่มีบันทึกอารมณ์ — บันทึกได้ตอนสิ้นสุดการกิน
        </p>
      )}
    </section>
  );
}