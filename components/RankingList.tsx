"use client";

import { useState } from "react";
import Image from "next/image";

import { levelFromPoints } from "@/lib/healthy-journey";
import type { RankingEntry } from "@/lib/ranking-service";

interface RankingListProps {
  /** Top หน้าแรกจาก server (ไม่ต้องโหลดซ้ำ). */
  initialEntries: RankingEntry[];
  /** จำนวนผู้ติดอันดับทั้งหมด. */
  total: number;
  /** อันดับของตัวเอง — null ถ้ายังไม่มีแต้ม. */
  myRank: number | null;
  myPoints: number;
  /** รูปโปรไฟล์ของตัวเอง (ไว้โชว์ในการ์ดอันดับตอนหลุดโผ). */
  myAvatarUrl: string | null;
  /** ต้องตรงกับ limit ที่ server ใช้โหลดหน้าแรก. */
  pageSize: number;
}

/** สีวงกลมอันดับ: ทอง/เงิน/ทองแดง + เทกลาง. */
function rankBadgeClass(rank: number): string {
  if (rank === 1) return "bg-[#FFF3D6] text-[#B7791F]";
  if (rank === 2) return "bg-zinc-100 text-zinc-600";
  if (rank === 3) return "bg-[#FFEDE3] text-[#A85B2A]";
  return "bg-zinc-50 text-zinc-500";
}

/** สีพื้นอักษรย่อ วนตามอันดับ (deterministic ไม่ต้องจำ state). */
const INITIAL_BG = [
  "bg-[#E8F5EC] text-[#18A659]",
  "bg-[#E8F0FE] text-[#2B5CE6]",
  "bg-[#FDEEF4] text-[#C2437E]",
  "bg-[#FFF3D6] text-[#B7791F]",
  "bg-[#EFEBFF] text-[#6C4FD8]",
];

function initialBg(rank: number): string {
  return INITIAL_BG[(rank - 1) % INITIAL_BG.length] ?? INITIAL_BG[0] ?? "";
}

/** รูปโปรไฟล์วงกลม — มีรูปใช้ next/image ไม่มีใช้ตัวอักษรย่อ (ไม่มีวันแตก). */
function Avatar({
  avatarUrl,
  displayName,
  rank,
}: {
  avatarUrl: string | null;
  displayName: string;
  rank: number;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`รูปโปรไฟล์ของ ${displayName}`}
        width={40}
        height={40}
        loading="lazy"
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold ${initialBg(rank)}`}
    >
      {initial}
    </span>
  );
}

function Row({ entry, highlight }: { entry: RankingEntry; highlight: boolean }) {
  return (
    <li
      className={`flex items-center gap-3 p-4 ${
        highlight ? "bg-[#E8F5EC]" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rankBadgeClass(entry.rank)}`}
      >
        {entry.rank}
      </span>
      <Avatar
        avatarUrl={entry.avatarUrl}
        displayName={entry.displayName}
        rank={entry.rank}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-zinc-900">
          {entry.displayName}
          {entry.isMe && (
            <span className="ml-2 rounded-full bg-[#18A659] px-2 py-0.5 align-middle text-xs font-medium text-white">
              คุณ
            </span>
          )}
        </span>
        <span className="block text-sm text-zinc-500">
          เลเวล {entry.level} · {entry.totalPoints} exp
        </span>
      </span>
    </li>
  );
}

/** แถวโครง (skeleton) ตอนกดดูเพิ่มเติม — กันจอกระตุกตอนรอ. */
function SkeletonRows() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 border-t border-zinc-100 p-4"
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-100" />
          <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-100" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="h-4 w-2/3 rounded bg-zinc-100" />
            <div className="h-3 w-1/3 rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ลิสต์อันดับ + ปุ่ม "ดูเพิ่มเติม" (ต่อ offset ทีละ pageSize).
 * ถ้าตัวเองหลุดโผ จะมีการ์ด "อันดับของคุณ" ปักไว้ล่างสุดเสมอ.
 */
export default function RankingList({
  initialEntries,
  total,
  myRank,
  myPoints,
  myAvatarUrl,
  pageSize,
}: RankingListProps) {
  const [entries, setEntries] = useState<RankingEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const done = entries.length >= total;
  const showPinnedMine =
    myRank !== null && !entries.some((entry) => entry.isMe);

  async function loadMore() {
    if (loading || done) {
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/v1/ranking?limit=${pageSize}&offset=${entries.length}`
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const body = (await res.json()) as {
        success: boolean;
        data?: { entries?: RankingEntry[] };
      };
      if (!body.success || !Array.isArray(body.data?.entries)) {
        throw new Error("bad payload");
      }
      setEntries((prev) => [...prev, ...(body.data?.entries ?? [])]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="อันดับทั้งหมด">
        <ul className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white [&>li+li]:border-t [&>li+li]:border-zinc-100">
          {entries.map((entry) => (
            <Row
              key={`${entry.rank}-${entry.displayName}`}
              entry={entry}
              highlight={false}
            />
          ))}
        </ul>
        {loading && (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <SkeletonRows />
          </div>
        )}
        {entries.length === 0 && !loading && (
          <p className="px-1 py-6 text-center text-sm text-zinc-500">
            ยังไม่มีผู้ติดอันดับ
          </p>
        )}
      </section>

      {!done && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="min-h-[48px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-zinc-900 transition-colors active:bg-zinc-50 disabled:opacity-50"
        >
          {loading ? "กำลังโหลด…" : "ดูเพิ่มเติม"}
        </button>
      )}
      {error && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-zinc-500">โหลดเพิ่มเติมไม่สำเร็จ</p>
          <button
            type="button"
            onClick={loadMore}
            className="min-h-[44px] rounded-full px-4 text-sm font-semibold text-[#18A659]"
          >
            ลองใหม่
          </button>
        </div>
      )}
      {done && entries.length > 0 && (
        <p className="text-center text-xs text-zinc-400">
          แสดงครบ {total} คนแล้ว
        </p>
      )}

      {showPinnedMine && (
        <section
          aria-label="อันดับของคุณ"
          className="rounded-2xl border-2 border-[#18A659] bg-white p-2 shadow-sm"
        >
          <p className="px-3 pt-2 text-sm font-semibold text-[#128A48]">
            อันดับของคุณ
          </p>
          <Row
            entry={{
              rank: myRank,
              displayName: "คุณ",
              avatarUrl: myAvatarUrl,
              level: levelFromPoints(myPoints),
              totalPoints: myPoints,
              isMe: true,
            }}
            highlight
          />
        </section>
      )}
    </div>
  );
}
