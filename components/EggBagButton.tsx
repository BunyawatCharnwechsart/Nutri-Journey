import Link from "next/link";

/**
 * ปุ่มกระเป๋าสัตว์เลี้ยง → /bag (ตู้สะสมอยู่หน้านั้น แยกกับหน้าสุ่ม).
 * วางขวาบนของ header หน้า egg — เห็นโดยไม่ต้อง scroll.
 */
export default function EggBagButton() {
  return (
    <Link
      href="/bag"
      aria-label="กระเป๋าสัตว์เลี้ยง"
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
        <path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      </svg>
      กระเป๋าไข่
    </Link>
  );
}
