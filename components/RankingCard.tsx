import Link from "next/link";

/**
 * การ์ดทางลัดไปหน้า Ranking (วางในหน้าไข่ของคุณ ต่อจาก EggLevelCard).
 *
 * Static ล้วน — ไม่มี "use client" ไม่ดึงข้อมูลเพิ่ม กดทั้งใบได้
 * (ดีกับนิ้วมือถือ) สไตล์เดียวกับการ์ดอื่นในหน้า egg.
 */
export default function RankingCard() {
  return (
    <Link
      href="/ranking"
      aria-label="ดูอันดับ EXP ทั้งหมด"
      className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition-colors active:bg-zinc-50"
    >
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF7E6]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#B7791F"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
          <path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 2 4 4 4M17 6h3a1 1 0 0 1 1 1c0 2.5-2 4-4 4" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-zinc-900">
          อันดับ EXP
        </span>
        <span className="block truncate text-sm text-zinc-500">
          ดูอันดับสะสมของทุกคน
        </span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-xl text-zinc-400">
        ›
      </span>
    </Link>
  );
}
