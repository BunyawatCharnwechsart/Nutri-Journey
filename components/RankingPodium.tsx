import Image from "next/image";

import type { RankingEntry } from "@/lib/ranking-service";

/** วงแหวน avatar + สีเหรียญ/ขอบตามอันดับ 1/2/3. */
const PODIUM_STYLE = [
  { ring: "ring-[#F5B301]", medal: "bg-[#F5B301] ring-[#C78D06]", avatar: "h-20 w-20 text-2xl" },
  { ring: "ring-zinc-300", medal: "bg-zinc-400 ring-zinc-500", avatar: "h-14 w-14 text-lg" },
  { ring: "ring-[#D08A4E]", medal: "bg-[#C47B3F] ring-[#9C5F2C]", avatar: "h-14 w-14 text-lg" },
] as const;

function Crown() {
  return (
    <svg
      viewBox="0 0 48 44"
      fill="#F5B301"
      aria-hidden="true"
      className="h-10 w-12"
    >
      <circle cx="6" cy="8" r="3.5" />
      <circle cx="24" cy="4" r="3.5" />
      <circle cx="42" cy="8" r="3.5" />
      <path d="M8 14 4 34h40l-4-20-9 6-7-11-7 11-9-6Z" />
      <rect x="4" y="34" width="40" height="5" rx="2.5" />
      <circle cx="24" cy="26" r="3.5" fill="#FFF3D6" />
    </svg>
  );
}

/** ริบบิ้นฟ้ารูปตัว V รองหลังเหรียญเลข. */
function Ribbon() {
  return (
    <svg
      viewBox="0 0 40 22"
      aria-hidden="true"
      className="absolute top-0 left-1/2 h-[22px] w-10 -translate-x-1/2"
    >
      <path d="M20 22 8 2h8l4 7 4-7h8L20 22Z" fill="#2B7CD3" />
      <path d="M20 22 12 6h3l5 8 5-8h3l-8 16Z" fill="#1E5FA8" />
    </svg>
  );
}

function PodiumAvatar({ entry, size }: { entry: RankingEntry; size: string }) {
  const style = PODIUM_STYLE[(entry.rank - 1) % PODIUM_STYLE.length] ?? PODIUM_STYLE[0]!;
  if (entry.avatarUrl) {
    return (
      <Image
        src={entry.avatarUrl}
        alt={`รูปโปรไฟล์ของ ${entry.displayName}`}
        width={80}
        height={80}
        loading="lazy"
        className={`${size} shrink-0 rounded-full bg-zinc-100 object-cover ring-4 ${style.ring}`}
      />
    );
  }
  const initial = entry.displayName.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-zinc-200 font-bold text-zinc-500 ring-4 ${style.ring}`}
    >
      {initial}
    </span>
  );
}

function PodiumSpot({ entry, first }: { entry: RankingEntry; first: boolean }) {
  const style = PODIUM_STYLE[(entry.rank - 1) % PODIUM_STYLE.length] ?? PODIUM_STYLE[0]!;
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
      {first && <Crown />}
      <div className="relative pb-3">
        <PodiumAvatar entry={entry} size={style.avatar} />
        <span className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#2F3A4A] px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-white">
          Lv{entry.level}
        </span>
      </div>
      <div className="relative mt-1 flex justify-center">
        <Ribbon />
        <span
          aria-label={`อันดับที่ ${entry.rank}`}
          className={`relative z-10 mt-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ${style.medal}`}
        >
          {entry.rank}
        </span>
      </div>
      <p className="mt-1.5 w-full truncate text-sm font-bold text-zinc-900">
        {entry.displayName}
        {entry.isMe && (
          <span className="ml-1 rounded-full bg-[#18A659] px-1.5 py-px align-middle text-[10px] font-medium text-white">
            คุณ
          </span>
        )}
      </p>
      <p className="text-xs text-[#8A7B2D]">{entry.totalPoints} exp</p>
    </div>
  );
}

/**
 * โพเดียมที่ 1–3 (กลางใหญ่ + มงกุฎ, ซ้ายขวาเล็ก) — รับแถว 3 อันดับแรกของ
 * entries ที่โหลดอยู่ กดดูเพิ่มเติมแล้วไม่ขยับ.
 */
export default function RankingPodium({ entries }: { entries: RankingEntry[] }) {
  const [first, second, third] = entries;
  if (!first) {
    return null;
  }
  return (
    <section
      aria-label="สามอันดับแรก"
      className="flex items-end justify-center gap-2 px-2 pt-8"
    >
      {second ? (
        <PodiumSpot entry={second} first={false} />
      ) : (
        <div className="flex-1" aria-hidden="true" />
      )}
      <PodiumSpot entry={first} first />
      {third ? (
        <PodiumSpot entry={third} first={false} />
      ) : (
        <div className="flex-1" aria-hidden="true" />
      )}
    </section>
  );
}
