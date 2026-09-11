import {
  expForNextLevel,
  expInLevel,
  levelFromPoints,
  progressRatio,
} from "@/lib/healthy-journey";

interface EggLevelCardProps {
  /** Current healthy-journey XP of the user (healthy_journey.total_points). */
  totalPoints: number;
}

/**
 * Compact "current level" card: level number, XP progress (ครบ/ต้องครบ) and a
 * progress bar. Shared by the dashboard ("ไข่ของฉัน" section) and the full
 * my-egg page so the two never drift apart.
 */
export default function EggLevelCard({ totalPoints }: EggLevelCardProps) {
  const level = levelFromPoints(totalPoints);
  const needNext = expForNextLevel(level);
  const fillPercent = Math.round(progressRatio(totalPoints) * 100);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-end justify-between gap-4">
        <p className="text-xl font-bold text-zinc-900">เลเวล {level}</p>
        <p className="text-sm text-zinc-500">
          {expInLevel(totalPoints)} / {needNext ?? "MAX"} exp
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={fillPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="ความคืบหน้าเลเวล"
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-100"
      >
        <div
          className="h-full rounded-full bg-[#18A659] transition-all"
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </section>
  );
}