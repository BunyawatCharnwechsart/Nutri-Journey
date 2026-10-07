"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { avatarForEgg, levelFromPoints } from "@/lib/healthy-journey";
import EggLevelLine from "@/components/EggLevelLine";
import type { CollectedEgg } from "@/lib/egg-draw-service";

/**
 * ตู้สะสมไข่: รูปตามชนิด+level ของแต่ละฟอง, EXP รายฟอง, ปุ่มตั้งตัวเลี้ยง.
 * กดย้ายแล้วยิง PATCH แล้ว refresh ให้ server วาดใหม่ (state อยู่ที่ DB).
 * ชื่อแต่ละแถวใช้ displayName ที่ server resolve แล้ว (nickname ของมันเอง
 * → ชื่อรวมกรณี active → ชื่อชนิด).
 */
export default function EggCollection({
  collection,
}: {
  collection: CollectedEgg[];
}) {
  const router = useRouter();
  const [movingId, setMovingId] = useState<string | null>(null);

  async function setActive(id: string) {
    if (movingId) {
      return;
    }
    setMovingId(id);
    try {
      const res = await fetch("/api/v1/egg-draws/active", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drawId: id }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setMovingId(null);
    }
  }

  if (collection.length === 0) {
    return (
      <p className="mt-2 rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
        ยังไม่มีไข่ — อดติดกันให้ครบ 3 วันแล้วมากดสุ่มนะ
      </p>
    );
  }

  return (
    <ul className="mt-2 grid grid-cols-2 gap-3">
      {collection.map((egg) => {
        const level = levelFromPoints(egg.eggExp);
        return (
          <li
            key={egg.id}
            className={`flex flex-col items-center rounded-2xl border bg-white p-4 text-center ${
              egg.isActive ? "border-[#18A659]" : "border-zinc-200"
            }`}
          >
            <img
              src={avatarForEgg(egg.eggType, level)}
              alt={egg.eggName}
              width={96}
              height={96}
              loading="lazy"
              className="h-24 w-24 object-contain"
            />
            <p className="mt-1 w-full truncate text-sm font-semibold text-zinc-900">
              {egg.displayName}
            </p>
            <p className="text-xs text-zinc-500">
              <EggLevelLine exp={egg.eggExp} />
            </p>
            {egg.isActive ? (
              <span className="mt-2 rounded-full bg-[#18A659] px-3 py-1 text-xs font-medium text-white">
                ตัวเลี้ยง
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setActive(egg.id)}
                disabled={movingId !== null}
                className="mt-2 min-h-[40px] rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 active:bg-zinc-50 disabled:opacity-50"
              >
                {movingId === egg.id ? "กำลังย้าย…" : "ตั้งเป็นตัวเลี้ยง"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
