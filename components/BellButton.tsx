"use client";

import { useEffect, useRef, useState } from "react";

// ============================================================================
// ปุ่มกระดิ่ง LINE แจ้งเตือน (อยู่ถัดจาก icon ไข่ใน header)
//
// กดแล้วเปิด Modal กลางจอ แสดงสถานะว่าเปิด/ปิดการแจ้งเตือนอยู่ พร้อมปุ่ม
// สลับเปิด-ปิด สถานะทั้งหมดดึงจาก server (GET /api/v1/line/link) ไม่พึ่ง
// liff.getFriendship() อีกต่อไป และฟัง event `line:link-state-changed`
// เพื่อให้จุดสถานะอัปเดตเองเมื่อมีการเปลี่ยนจากที่อื่น.
//
// คำถามครั้งแรก (onboarding) จะ auto-open Modal ให้ครั้งเดียวตอนยังไม่ตอบ
// และปิดได้ด้วย ESC / กดพื้นหลัง / ปุ่ม X. ปุ่มทั้งหมดเป็น type=button.
// ============================================================================

/** Public "Add friend" page ของ OA (basic id @988yvqaz). */
const OA_ADD_FRIEND_URL = "https://line.me/R/ti/p/@988yvqaz";

/** Window event สำหรับ sync สถานะระหว่างหน้า. */
const LINE_STATUS_EVENT = "line:link-state-changed";

const LINE_GRADIENT = {
  background: "linear-gradient(135deg, #06C755 0%, #18A659 100%)",
} as const;

interface LinkStatus {
  loading: boolean;
  working: boolean;
  linked: boolean;
  /** ตอบคำถามครั้งแรกแล้วหรือยัง (ถามครั้งเดียวจบ). */
  onboarded: boolean;
  /** true = เป็นเพื่อน OA, false = ยังไม่เป็น, null = เช็คไม่สำเร็จ/ไม่รู้. */
  friend: boolean | null;
  message: string | null;
}

function emitLineStatus(linked: boolean, friend: boolean | null) {
  try {
    window.dispatchEvent(
      new CustomEvent(LINE_STATUS_EVENT, { detail: { linked, friend } })
    );
  } catch {
    // non-browser environment — ไม่มีใครฟังอยู่ดี
  }
}

async function getLiff() {
  const liff = (await import("@line/liff")).default;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  if (!liffId) {
    return null;
  }

  // liff.init() เซฟให้เรียกซ้ำได้ (กลายเป็น no-op เมื่อ init แล้ว)
  await liff.init({ liffId });
  return liff;
}

export default function BellButton() {
  const [open, setOpen] = useState(false);
  const autoOpenedRef = useRef(false);
  const [status, setStatus] = useState<LinkStatus>({
    loading: true,
    working: false,
    linked: false,
    onboarded: false,
    friend: null,
    message: null,
  });

  // โหลดสถานะครั้งแรก + auto-open ตอนยังไม่ตอบคำถามครั้งแรก + ฟัง event.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/v1/line/link", { cache: "no-store" });
        const json = (await res.json()) as {
          success?: boolean;
          data?: {
            linked?: boolean;
            onboarded?: boolean;
            friend?: boolean | null;
          };
        };
        if (cancelled) {
          return;
        }
        const { linked, onboarded, friend } = json.success
          ? json.data ?? {}
          : {};
        setStatus((prev) => ({
          ...prev,
          linked: Boolean(linked),
          onboarded: Boolean(onboarded),
          friend: friend ?? null,
          loading: false,
        }));
        if (!onboarded && !autoOpenedRef.current) {
          autoOpenedRef.current = true;
          setOpen(true);
        }
      } catch {
        if (!cancelled) {
          setStatus((prev) => ({
            ...prev,
            loading: false,
            message: "โหลดสถานะ LINE ไม่สำเร็จ ลองเปิดใหม่",
          }));
        }
      }
    };

    void load();
    window.addEventListener(LINE_STATUS_EVENT, load);

    return () => {
      cancelled = true;
      window.removeEventListener(LINE_STATUS_EVENT, load);
    };
  }, []);

  // ปิด Modal ด้วยปุ่ม ESC.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function apply(next: LinkStatus) {
    setStatus(next);
    emitLineStatus(next.linked, next.friend);
  }

  async function enable() {
    setStatus((prev) => ({ ...prev, working: true, message: null }));
    try {
      const res = await fetch("/api/v1/line/link", { method: "POST" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { linked?: boolean; friend?: boolean | null };
      };
      if (res.ok && json.success) {
        apply({
          ...status,
          linked: true,
          onboarded: true,
          friend: json.data?.friend ?? null,
          working: false,
        });
      } else {
        apply({
          ...status,
          working: false,
          message: "เปิดการแจ้งเตือนไม่สำเร็จ ลองอีกครั้ง",
        });
      }
    } catch {
      apply({
        ...status,
        working: false,
        message: "เชื่อมต่อไม่สำเร็จ ลองอีกครั้ง",
      });
    }
  }

  async function disable() {
    setStatus((prev) => ({ ...prev, working: true, message: null }));
    try {
      const res = await fetch("/api/v1/line/link", { method: "DELETE" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { linked?: boolean; onboarded?: boolean };
      };
      const next: LinkStatus = {
        ...status,
        linked: Boolean(res.ok && json.success && json.data?.linked),
        onboarded: Boolean(res.ok && json.success && json.data?.onboarded),
        friend: null,
        working: false,
      };
      apply(next);
    } catch {
      setStatus((prev) => ({
        ...prev,
        working: false,
        message: "ปิดการแจ้งเตือนไม่สำเร็จ ลองอีกครั้ง",
      }));
    }
  }

  /** ตอบ "ไม่สนใจ" กับคำถามครั้งแรก (ถามครั้งเดียวจบ ไม่มาถามอีก). */
  async function dismiss() {
    setStatus((prev) => ({ ...prev, working: true, message: null }));
    try {
      const res = await fetch("/api/v1/line/link/dismiss", { method: "POST" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { onboarded?: boolean };
      };
      setStatus((prev) => ({
        ...prev,
        onboarded: Boolean(res.ok && json.success && json.data?.onboarded),
        working: false,
      }));
    } catch {
      setStatus((prev) => ({
        ...prev,
        working: false,
        message: "บันทึกการตัดสินใจไม่สำเร็จ ลองอีกครั้ง",
      }));
    }
  }

  async function openAddFriend() {
    try {
      const liff = await getLiff();
      if (liff) {
        liff.openWindow({ url: OA_ADD_FRIEND_URL, external: true });
        return;
      }
    } catch {
      // fall through เป็น window.open ธรรมดา
    }
    window.open(OA_ADD_FRIEND_URL, "_blank", "noopener,noreferrer");
  }

  /** "เพิ่มเพื่อนแล้ว กดตรวจสอบ" — ขอคำตอบสดจาก server เสมอ. */
  async function refresh() {
    setStatus((prev) => ({ ...prev, working: true, message: null }));
    try {
      const res = await fetch("/api/v1/line/link", { method: "POST" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { linked?: boolean; friend?: boolean | null };
      };
      const next: LinkStatus = {
        ...status,
        linked: Boolean(res.ok && json.success && json.data?.linked),
        onboarded: true,
        friend:
          res.ok && json.success && json.data ? json.data.friend ?? null : null,
        message: null,
        working: false,
      };
      apply(next);
    } catch {
      setStatus((prev) => ({
        ...prev,
        working: false,
        message: "ตรวจสอบไม่สำเร็จ ลองอีกครั้ง",
      }));
    }
  }

  const ready = status.linked && status.friend === true;
  const bellColor = ready
    ? "#18A659"
    : status.loading
      ? "#d4d4d8"
      : "#a1a1aa";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ready ? "LINE แจ้งเตือนเปิดอยู่" : "จัดการ LINE แจ้งเตือน"}
        aria-expanded={open}
        className="relative rounded-full p-1 transition-colors hover:bg-zinc-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill={bellColor}
          aria-hidden="true"
          className="h-[30px] w-[30px]"
        >
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        {!status.onboarded && !status.loading && (
          <span className="absolute top-0 right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="line-notification-title"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col gap-4 rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between">
              <h2
                id="line-notification-title"
                className="text-base font-semibold text-zinc-900"
              >
                LINE แจ้งเตือน
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="ปิด"
                className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                  className="h-5 w-5"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {status.loading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#18A659] border-t-transparent" />
                กำลังตรวจสอบ...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        status.linked ? "bg-[#18A659]" : "bg-zinc-300"
                      }`}
                    />
                    LINE แจ้งเตือน {status.linked ? "เปิดอยู่" : "ปิดอยู่"}
                  </span>
                </div>

                {!status.onboarded ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium text-zinc-800">
                      อยากให้ NutriJourney ส่ง LINE แจ้งเตือนเมื่อหมดเวลาอด/กินไหม?
                    </p>
                    <button
                      type="button"
                      onClick={enable}
                      disabled={status.working}
                      style={LINE_GRADIENT}
                      className="w-full rounded-xl px-6 py-3 text-[16px] font-bold text-white transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {status.working ? "กำลังเปิดใช้งาน..." : "เปิด LINE แจ้งเตือน"}
                    </button>
                    <button
                      type="button"
                      onClick={dismiss}
                      disabled={status.working}
                      className="w-full rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ไม่สนใจ (ไม่ถามอีก)
                    </button>
                  </div>
                ) : (
                  <>
                    {status.linked && status.friend === true && (
                      <div className="rounded-xl bg-[#18A659]/10 px-4 py-3 text-sm font-medium text-[#148D4C]">
                        ✓ พร้อมส่งการแจ้งเตือนแล้ว
                      </div>
                    )}
                    {status.linked && status.friend === false && (
                      <div className="flex flex-col gap-2">
                        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                          ยังต้องเพิ่ม LINE (NutriJourney) เป็นเพื่อนก่อน ถึงจะได้รับ
                          การแจ้งเตือน
                        </div>
                        <button
                          type="button"
                          onClick={openAddFriend}
                          style={LINE_GRADIENT}
                          className="w-full rounded-xl px-6 py-3 text-[16px] font-bold text-white transition-[filter] hover:brightness-105"
                        >
                          เพิ่มเพื่อน LINE (NutriJourney)
                        </button>
                        <button
                          type="button"
                          onClick={refresh}
                          disabled={status.working}
                          className="w-full rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {status.working
                            ? "กำลังตรวจสอบ..."
                            : "เพิ่มเพื่อนแล้ว กดตรวจสอบ"}
                        </button>
                      </div>
                    )}
                    {status.linked && status.friend === null && (
                      <div className="flex flex-col gap-2">
                        <div className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                          ตรวจสอบสถานะ LINE ไม่สำเร็จชั่วคราว
                        </div>
                        <button
                          type="button"
                          onClick={refresh}
                          disabled={status.working}
                          className="w-full rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {status.working
                            ? "กำลังตรวจสอบ..."
                            : "ลองตรวจสอบอีกครั้ง"}
                        </button>
                      </div>
                    )}
                    {!status.linked && (
                      <p className="text-sm text-zinc-500">
                        ยังไม่ได้รับ LINE แจ้งเตือน — เปิดได้ทุกเมื่อ
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={status.linked ? disable : enable}
                      disabled={status.working}
                      style={status.linked ? undefined : LINE_GRADIENT}
                      className={`w-full rounded-xl px-6 py-3 text-[16px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        status.linked
                          ? "border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                          : "text-white hover:brightness-105"
                      }`}
                    >
                      {status.working
                        ? "กำลังดำเนินการ..."
                        : status.linked
                          ? "ปิด LINE แจ้งเตือน"
                          : "เปิด LINE แจ้งเตือน"}
                    </button>
                  </>
                )}

                {status.message && (
                  <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {status.message}
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}