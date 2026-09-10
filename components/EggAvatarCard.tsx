"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface EggAvatarCardProps {
  /** URL of the avatar SVG for the current level (e.g. /avatar/level3.svg). */
  avatarSrc: string;
  /** Current egg name, e.g. "ไข่". */
  name: string;
  /** Current level — level 0 shows the "hatch your habit" hint. */
  level: number;
}

/**
 * Egg avatar block of the my-egg page: the image, its renamable name and —
 * only while the egg is still level 0 — the hint to complete daily missions.
 *
 * Clicking the name opens a rename modal (backdrop click / ESC closes it).
 * Saving PATCHes /api/v1/healthy-journey then calls router.refresh() so the
 * server-rendered name updates.
 */
export default function EggAvatarCard({
  avatarSrc,
  name,
  level,
}: EggAvatarCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function openRename() {
    setValue(name);
    setError(null);
    setOpen(true);
  }

  // Move focus into the input as soon as the modal mounts.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("กรุณากรอกชื่อไข่");
      return;
    }
    if (trimmed.length > 20) {
      setError("ชื่อไข่ต้องไม่เกิน 20 ตัวอักษร");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/healthy-journey", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarName: trimmed }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      if (!res.ok) {
        throw new Error(json?.error?.message ?? "เปลี่ยนชื่อไม่สำเร็จ");
      }

      setOpen(false);
      // Re-fetch server props so the displayed name updates.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เปลี่ยนชื่อไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarSrc}
        alt={`${name} ระดับ ${level}`}
        className="h-36 w-36 shrink-0"
      />

      <button
        type="button"
        onClick={openRename}
        className="inline-flex items-center gap-1.5 text-lg font-bold text-zinc-900 transition-colors hover:text-[#18A659]"
        aria-label="เปลี่ยนชื่อไข่"
      >
        {name}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-4 w-4 text-zinc-400"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>

      {level === 0 && (
        <p className="max-w-xs text-sm text-zinc-500">
          ทำภารกิจรายวันให้สำเร็จเพื่อช่วยฟักนิสัยรักสุขภาพของคุณ
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="เปลี่ยนชื่อไข่"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900">เปลี่ยนชื่อไข่</h3>
            <p className="mt-1 text-sm text-zinc-500">
              ตั้งชื่อเจ้าตัวน้อยของคุณได้ตามใจ
            </p>

            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={20}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
                if (e.key === "Escape") setOpen(false);
              }}
              className="mt-4 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors focus:border-[#18A659] focus:ring-2 focus:ring-[#18A659]/30"
            />

            {error && (
              <p
                className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600"
                role="alert"
              >
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="flex h-14 flex-1 items-center justify-center rounded-full border border-zinc-300 text-base font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex h-14 flex-1 items-center justify-center rounded-full bg-[#18A659] px-5 text-base font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}