"use client";

import { useState } from "react";
import Image from "next/image";

import type { OwnedBanners } from "@/lib/banner-service";
import type { BannerType } from "@/lib/season";
import BannerBadge from "@/components/BannerBadge";
import BannerPickerModal from "@/components/BannerPickerModal";

export interface ActiveBannerState {
  banner: BannerType | null;
  rankingId: string | null;
  seasonKey: string | null;
}

/**
 * Card โปรไฟล์บนสุดของ /profile — รูป + ชื่อ + Banner + ปุ่มเปลี่ยน.
 * รูป/ชื่อ sync จาก LINE (แสดงอย่างเดียว ไม่เปิดอัปโหลด v1).
 * ป้ายระบุสมัยข้อความยาวเลยอยู่บรรทัดของตัวเองใต้ชื่อ (wrap ได้).
 */
export default function ProfileCard({
  displayName,
  avatarUrl,
  level,
  owned,
}: {
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  owned: OwnedBanners;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ActiveBannerState>({
    banner: owned.active,
    rankingId: owned.activeRankingId,
    seasonKey: owned.activeSeasonKey,
  });
  const name = displayName?.trim() || "นักเดินทางไร้ชื่อ";
  const initial = name.charAt(0).toUpperCase() || "?";

  return (
    <section
      aria-label="ข้อมูลโปรไฟล์"
      className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={`รูปโปรไฟล์ของ ${name}`}
          width={64}
          height={64}
          className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-[#18A659]/20"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#E8F5EC] text-2xl font-bold text-[#18A659]"
        >
          {initial}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold text-zinc-900">{name}</p>
        {active.banner != null && (
          <span className="-ml-2 flex flex-wrap items-center gap-1">
            <BannerBadge banner={active.banner} seasonKey={active.seasonKey} />
          </span>
        )}
        <p className="mt-0.5 text-sm text-zinc-500">เลเวล {level}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 min-h-[44px] rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          เปลี่ยน Banner
        </button>
      </div>

      {open && (
        <BannerPickerModal
          owned={owned}
          onClose={() => setOpen(false)}
          onSaved={setActive}
        />
      )}
    </section>
  );
}
