import Link from "next/link";

/**
 * ปุ่มตู้สุ่ม → /egg-draw (หน้าสุ่มไข่).
 * วางขวาบนของ header หน้า egg — เห็นโดยไม่ต้อง scroll.
 */
export default function EggDrawButton() {
  return (
    <Link
      href="/egg-draw"
      aria-label="ตู้สุ่ม"
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition-colors active:bg-zinc-50"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-5 w-5"
      >
        <path d="M12 3a6 6 0 0 1 6 6v2H6V9a6 6 0 0 1 6-6Z" />
        <rect x="6" y="11" width="12" height="9" rx="2" />
        <circle cx="12" cy="15.5" r="1.4" />
      </svg>
      ตู้สุ่ม
    </Link>
  );
}
