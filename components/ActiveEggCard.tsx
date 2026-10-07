import Link from "next/link";

import {
  avatarForEgg,
  expForNextLevel,
  expInLevel,
  levelFromPoints,
  progressRatio,
} from "@/lib/healthy-journey";

export interface ActiveEgg {
  name: string;
  type: string;
  exp: number;
}

/**
 * การ์ดเลเวลของไข่ตัวเลี้ยง (แยกกับการ์ดเลเวลรวมของ user ที่เป็นโทนเขียว —
 * การ์ดนี้โทนม่วง) โชว์รูปตามชนิด+level, ชื่อ, exp ใน level และแถบความคืบหน้า.
 * ยังไม่มีตัวเลี้ยงโชว์การ์ดว่างชวนไปสุ่มแทน (ไม่พัง).
 */
export default function ActiveEggCard({ egg }: { egg: ActiveEgg | null }) {
  if (!egg) {
    return (
      <section
        aria-label="ไข่ตัวเลี้ยง"
        className="rounded-2xl border border-dashed border-zinc-200 bg-white p-5 text-center"
      >
        <p className="text-base font-semibold text-zinc-900">ยังไม่มีตัวเลี้ยง</p>
        <p className="mt-1 text-sm text-zinc-500">
          สุ่มไข่ฟองแรกแล้วจะมาโชว์ตรงนี้
        </p>
        <Link
          href="/egg-draw"
          className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 active:bg-zinc-50"
        >
          ไปหน้าสุ่มไข่ ›
        </Link>
      </section>
    );
  }

  const level = levelFromPoints(egg.exp);
  const needNext = expForNextLevel(level);
  const fillPercent = Math.round(progressRatio(egg.exp) * 100);

  return (
    <section
      aria-label="ไข่ตัวเลี้ยง"
      className="rounded-2xl border border-zinc-200 bg-white p-5"
    >
      <div className="flex items-center gap-4">
        <img
          src={avatarForEgg(egg.type, level)}
          alt={`${egg.name} ระดับ ${level}`}
          width={64}
          height={64}
          loading="lazy"
          className="h-16 w-16 shrink-0 object-contain"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-zinc-900">
            {egg.name}
            <span className="ml-2 rounded-full bg-[#6C4FD8] px-2 py-0.5 align-middle text-xs font-medium text-white">
              ตัวเลี้ยง
            </span>
          </p>
          <p className="mt-0.5 text-sm text-[#6C4FD8]">
            เลเวล {level} · {expInLevel(egg.exp)} / {needNext ?? "MAX"} exp
          </p>
        </div>
      </div>
      <div
        role="progressbar"
        aria-valuenow={fillPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="ความคืบหน้าเลเวลไข่"
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-100"
      >
        <div
          className="h-full rounded-full bg-[#6C4FD8] transition-all"
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </section>
  );
}
