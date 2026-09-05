"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

// Register Chart.js pieces once per app instance (canvas-based, no re-render).
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

export interface WeightPoint {
  id: string;
  /** "YYYY-MM-DD" (ICT calendar day). */
  date: string;
  weightKg: number;
}

const BRAND_GREEN = "#18A659";

const MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const MONTHS_FULL = [
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

function parts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

/** "2026-06-10" → "10 มิ.ย." (short, fits narrow mobile axis). */
function shortLabel(date: string): string {
  const { month, day } = parts(date);
  return `${day} ${MONTHS_SHORT[month - 1] ?? ""}`.trim();
}

/** "2026-06-10" → "10 มิถุนายน 2026" (full, used in the tooltip title). */
function fullLabel(date: string): string {
  const { year, month, day } = parts(date);
  return `${day} ${MONTHS_FULL[month - 1] ?? ""} ${year}`.trim();
}

/**
 * Monthly weight line chart backed by Chart.js.
 *
 * Renders the logs passed from the server (already normalized to
 * `WeightPoint`s) with the project's green brand color. Responsive by using a
 * fixed-height wrapper + `maintainAspectRatio: false`, so it scales cleanly on
 * mobile.
 */
export default function WeightChart({ logs }: { logs: WeightPoint[] }) {
  if (logs.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">
        ยังไม่มีบันทึกน้ำหนักใน 3 เดือนที่ผ่านมา
      </p>
    );
  }

  const labels = logs.map((log) => ({
    short: shortLabel(log.date),
    full: fullLabel(log.date),
  }));

  const weights = logs.map((log) => log.weightKg);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);

  const data: ChartData<"line"> = {
    labels: labels.map((label) => label.short),
    datasets: [
      {
        label: "น้ำหนัก",
        data: weights,
        borderColor: BRAND_GREEN,
        backgroundColor: "rgba(24, 166, 89, 0.12)",
        pointBackgroundColor: BRAND_GREEN,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        spanGaps: true,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
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
          title: (items) => {
            const first = items[0];
            return first ? (labels[first.dataIndex]?.full ?? "") : "";
          },
          label: (item) => `${(item.parsed.y as number).toFixed(1)} กก.`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: {
          color: "#71717a",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
          font: { size: 11 },
        },
      },
      y: {
        beginAtZero: false,
        suggestedMin: Math.floor(minWeight - 1),
        suggestedMax: Math.ceil(maxWeight + 1),
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        ticks: { color: "#71717a", font: { size: 11 } },
      },
    },
  };

  return (
    <div
      role="img"
      aria-label="กราฟน้ำหนักย้อนหลัง 3 เดือน"
      className="h-64 w-full sm:h-72"
    >
      <Line data={data} options={options} />
    </div>
  );
}