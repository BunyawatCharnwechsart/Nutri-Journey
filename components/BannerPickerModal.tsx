"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { OwnedBanners } from "@/lib/banner-service";
import BannerBadge from "@/components/BannerBadge";
import type { ActiveBannerState } from "@/components/ProfileCard";

interface BannerPickerModalProps {
  owned: OwnedBanners;
  onClose: () => void;
  onSaved: (active: ActiveBannerState) => void;
}

/** ค่าที่เลือกใน radio: แถว season เจาะจง / betatester / ถอดออก. */
type Selection =
  | { kind: "ranking"; id: string }
  | { kind: "betatester" }
  | { kind: "none" };

function selectionKey(selection: Selection): string {
  if (selection.kind === "ranking") return `rank:${selection.id}`;
  return selection.kind;
}

function parseSelection(key: string): Selection {
  if (key.startsWith("rank:")) {
    return { kind: "ranking", id: key.slice("rank:".length) };
  }
  if (key === "betatester") {
    return { kind: "betatester" };
  }
  return { kind: "none" };
}

/**
 * Modal เลือก Banner ที่สวม — ป้าย season เลือกทีละสมัย (เช่น แชมป์ของ
 * 2026-Q4 โดยเฉพาะ) + betatester + ปุ่มถอดออก.
 */
export default function BannerPickerModal({
  owned,
  onClose,
  onSaved,
}: BannerPickerModalProps) {
  const router = useRouter();
  const initial: Selection =
    owned.activeRankingId != null
      ? { kind: "ranking", id: owned.activeRankingId }
      : owned.active === "betatester"
        ? { kind: "betatester" }
        : { kind: "none" };
  const [selectedKey, setSelectedKey] = useState(selectionKey(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // มีของให้เลือกไหม — ป้าย season (instances) หรือ betatester (ผู้ร่วม Beta).
  const hasAny = owned.instances.length > 0 || owned.betatester > 0;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const selection = parseSelection(selectedKey);
      const body =
        selection.kind === "ranking"
          ? { rankingId: selection.id }
          : selection.kind === "betatester"
            ? { banner: "betatester" }
            : { banner: null };

      const res = await fetch("/api/v1/profile/banner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        data?: {
          banner?: string | null;
          rankingId?: string | null;
          seasonKey?: string | null;
          streak?: number | null;
        };
        error?: { message?: string; code?: string };
      } | null;

      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message ?? "บันทึก Banner ไม่สำเร็จ");
      }

      const banner = (json.data?.banner ?? null) as ActiveBannerState["banner"];
      onSaved({
        banner,
        rankingId: json.data?.rankingId ?? null,
        seasonKey: json.data?.seasonKey ?? null,
        streak: json.data?.streak ?? null,
      });
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึก Banner ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function rowClass(checked: boolean): string {
    return `flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
      checked
        ? "border-[#18A659] bg-[#E8F5EC]"
        : "border-zinc-200 bg-white active:bg-zinc-50"
    }`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="เลือก Banner"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-zinc-900">เลือก Banner</h3>
        <p className="mt-1 text-sm text-zinc-500">
          สวมได้ครั้งละ 1 ชิ้น — โชว์หลังชื่อทุกหน้า
        </p>

        {!hasAny ? (
          <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
            คุณยังไม่มี Banner — ติดอันดับ 1-3 ของ Season เพื่อปลดล็อก
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Banner ที่มี">
            {owned.instances.map((instance) => {
              const key = `rank:${instance.id}`;
              const checked = selectedKey === key;
              return (
                <label key={key} className={rowClass(checked)}>
                  <input
                    type="radio"
                    name="banner"
                    value={key}
                    checked={checked}
                    onChange={() => setSelectedKey(key)}
                    className="h-4 w-4 shrink-0 accent-[#18A659]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="-ml-2 flex flex-wrap items-center gap-1">
                      <BannerBadge
                        banner={instance.banner}
                        seasonKey={instance.seasonKey}
                        streak={instance.streak}
                      />
                    </span>
                  </span>
                </label>
              );
            })}

            {/* betatester โชว์เฉพาะผู้ร่วมทดสอบ Beta (owned.betatester > 0) —
                ownership ตรวจฝั่ง server อีกชั้นตอน PATCH. */}
            {owned.betatester > 0 && (
              <label className={rowClass(selectedKey === "betatester")}>
                <input
                  type="radio"
                  name="banner"
                  value="betatester"
                  checked={selectedKey === "betatester"}
                  onChange={() => setSelectedKey("betatester")}
                  className="h-4 w-4 shrink-0 accent-[#18A659]"
                />
                <span className="min-w-0 flex-1">
                  <span className="-ml-2 flex flex-wrap items-center gap-1">
                    <BannerBadge banner="betatester" />
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-400">
                    ป้ายสำหรับผู้ร่วมทดสอบช่วง Beta
                  </span>
                </span>
              </label>
            )}

            <label className={rowClass(selectedKey === "none")}>
              <input
                type="radio"
                name="banner"
                value="none"
                checked={selectedKey === "none"}
                onChange={() => setSelectedKey("none")}
                className="h-4 w-4 shrink-0 accent-[#18A659]"
              />
              <span className="text-sm font-medium text-zinc-700">ถอด Banner ออก</span>
            </label>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-14 flex-1 items-center justify-center rounded-full border border-zinc-300 text-base font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasAny}
            className="flex h-14 flex-1 items-center justify-center rounded-full bg-[#18A659] px-5 text-base font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
