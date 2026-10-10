import Link from "next/link";

/**
 * การ์ดภารกิจสุ่มไข่ ( section "ภารกิจสุ่มไข่" ในหน้าไข่ของคุณ).
 *
 * Server Component รับค่ามาจาก page (page ดึง status ฝั่ง server เอง ไม่ยิง
 * HTTP เพิ่ม): ซ้ายชื่อภารกิจ+คำอธิบาย+ความคืบหน้า, ขวาไอคอนไข่ + ปุ่ม
 * "กดเพื่อรับ" ไปหน้าสุ่ม (เขียวเมื่อมีสิทธิ์ค้าง เทาเมื่อยังไม่มี).
 */
interface EggDrawCardProps {
  streakDays: number;
  pendingDraws: number;
}

export default function EggDrawCard({
  streakDays,
  pendingDraws,
}: EggDrawCardProps) {
  const hasPending = pendingDraws > 0;

  return (
    <section
      aria-label="ภารกิจสุ่มไข่"
      className="rounded-2xl border border-zinc-200 bg-white p-5"
    >
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-zinc-900">
            ทำ IF ครบ 3 วัน
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            ทำ IF ให้ครบ 3 วันติดเพื่อใช้สุ่ม
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            ติดกัน {streakDays}/3 วัน
            {hasPending ? ` · สิทธิ์ ${pendingDraws} ครั้ง` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFE9FF]"
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
          <Link
            href="/egg-draw"
            aria-label="ไปหน้าสุ่มไข่"
            className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold transition-colors ${
              hasPending
                ? "bg-[#18A659] text-white active:bg-[#128A48]"
                : "bg-zinc-100 text-zinc-500 active:bg-zinc-200"
            }`}
          >
            กดเพื่อรับ
          </Link>
        </div>
      </div>
    </section>
  );
}
