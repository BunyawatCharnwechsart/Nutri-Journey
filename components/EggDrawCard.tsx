import Link from "next/link";

/**
 * การ์ดภารกิจสุ่มไข่ (วางในหน้าไข่ของคุณ หลัง section ภารกิจประจำวัน).
 *
 * Server Component รับค่ามาจาก page (page ดึง status ฝั่ง server เอง ไม่ยิง
 * HTTP เพิ่ม): บอกติดกันกี่วัน (X/3), สิทธิ์คงเหลือกี่ครั้ง, ปุ่มไปหน้าสุ่มไข่.
 * ถ้ามีสิทธิ์ค้าง ปุ่มจะไฮไลต์เขียวชวนกด.
 */
interface EggDrawCardProps {
  streakDays: number;
  progress: number;
  pendingDraws: number;
}

export default function EggDrawCard({
  streakDays,
  progress,
  pendingDraws,
}: EggDrawCardProps) {
  const hasPending = pendingDraws > 0;

  return (
    <section
      aria-label="ภารกิจสุ่มไข่"
      className="rounded-2xl border border-zinc-200 bg-white p-5"
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#EFE9FF]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6C4FD8"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M12 3c3.5 0 6 4.5 6 9a6 6 0 0 1-12 0c0-4.5 2.5-9 6-9Z" />
            <path d="M9.5 13.5c.5 1.2 1.4 1.8 2.5 1.8s2-.6 2.5-1.8" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-900">
            สุ่มไข่เมื่ออดติดกัน 3 วัน
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            ทำติดต่อกันแล้ว {streakDays}/3 วัน
            {hasPending
              ? ` · มีสิทธิ์สุ่ม ${pendingDraws} ครั้ง`
              : " · ยังไม่มีสิทธิ์สุ่ม"}
          </p>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-label="ความคืบหน้าอดติดกัน"
        className="mt-4 flex gap-1.5"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-2.5 flex-1 rounded-full ${
              i < progress ? "bg-[#6C4FD8]" : "bg-zinc-100"
            }`}
          />
        ))}
      </div>

      <Link
        href="/egg-draw"
        aria-label="ไปหน้าสุ่มไข่"
        className={`mt-4 flex min-h-[48px] items-center justify-center rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${
          hasPending
            ? "bg-[#18A659] text-white active:bg-[#128A48]"
            : "border border-zinc-200 bg-white text-zinc-900 active:bg-zinc-50"
        }`}
      >
        {hasPending ? `ไปสุ่มไข่ (${pendingDraws} สิทธิ์)` : "ไปหน้าสุ่มไข่ ›"}
      </Link>
    </section>
  );
}
