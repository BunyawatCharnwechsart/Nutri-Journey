"use client";

import { useEffect, useState } from "react";

// ============================================================================
// LINE แจ้งเตือน
//
// LINE user ids are identical across our login (LIFF) and OA channels because
// both belong to the same provider. The account is bound server side at login
// (users.oa_user_id === users.line_user_id), so the ONLY thing a user must do
// to start receiving pushes is make the OA a friend.
//
// The friendship answer comes from the SERVER (GET/POST /api/v1/line/link,
// backed by the LINE `GET /v2/bot/profile/{id}` check with a short DB cache).
// We do NOT use liff.getFriendship() anymore — it returns false in many
// legitimate contexts (app opened from a URL instead of a chat, missing scope,
// wrong channel) and made the UI claim "not a friend" for real friends.
//
// The opt-in question is asked exactly ONCE, on the first login. After the
// user answers (accept or decline) the prompt never shows again; later visits
// only show a quiet on/off switch.
//
// Every successful state change dispatches `line:link-state-changed` so the
// little green status dot in the dashboard header updates without a reload.
// ============================================================================

/** Public "Add friend" page of the OA (basic id @988yvqaz). */
const OA_ADD_FRIEND_URL = "https://line.me/R/ti/p/@988yvqaz";

/** Window event the header dot listens for. */
const LINE_STATUS_EVENT = "line:link-state-changed";

const LINE_GRADIENT = {
  background: "linear-gradient(135deg, #06C755 0%, #18A659 100%)",
} as const;

interface LinkStatus {
  loading: boolean;
  working: boolean;
  linked: boolean;
  /** Has the one-time onboarding prompt been answered? */
  onboarded: boolean;
  /** true = friend, false = not a friend, null = check failed/unknown. */
  friend: boolean | null;
  message: string | null;
}

function emitLineStatus(linked: boolean, friend: boolean | null) {
  try {
    window.dispatchEvent(
      new CustomEvent(LINE_STATUS_EVENT, { detail: { linked, friend } })
    );
  } catch {
    // non-browser environment — nothing listens anyway
  }
}

async function getLiff() {
  const liff = (await import("@line/liff")).default;
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

  if (!liffId) {
    return null;
  }

  // liff.init() is safe to call repeatedly (it becomes a no-op once done).
  await liff.init({ liffId });
  return liff;
}

export default function LineNotificationSection() {
  const [status, setStatus] = useState<LinkStatus>({
    loading: true,
    working: false,
    linked: false,
    onboarded: false,
    friend: null,
    message: null,
  });

  // Load the notification state once on mount. friend comes from the server.
  useEffect(() => {
    let cancelled = false;
    (async () => {
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
      } catch {
        if (!cancelled) {
          setStatus((prev) => ({
            ...prev,
            loading: false,
            message: "โหลดสถานะ LINE ไม่สำเร็จ ลองเปิดใหม่",
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setStatus((prev) => ({ ...prev, working: true, message: null }));
    const apply = (next: LinkStatus) => {
      setStatus(next);
      emitLineStatus(next.linked, next.friend);
    };
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
      setStatus(next);
      emitLineStatus(next.linked, next.friend);
    } catch {
      setStatus((prev) => ({
        ...prev,
        working: false,
        message: "ปิดการแจ้งเตือนไม่สำเร็จ ลองอีกครั้ง",
      }));
    }
  }

  /** Declines the one-time prompt. Called only at first login, once. */
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
        // Opens the "Add friend" page in the LINE app's own browser.
        liff.openWindow({ url: OA_ADD_FRIEND_URL, external: true });
        return;
      }
    } catch {
      // fall through to a plain window.open
    }
    window.open(OA_ADD_FRIEND_URL, "_blank", "noopener,noreferrer");
  }

  /** "เพิ่มเพื่อนแล้ว กดตรวจสอบ" — always asks the server for a fresh answer. */
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
      setStatus(next);
      emitLineStatus(next.linked, next.friend);
    } catch {
      setStatus((prev) => ({
        ...prev,
        working: false,
        message: "ตรวจสอบไม่สำเร็จ ลองอีกครั้ง",
      }));
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">
        LINE แจ้งเตือน
      </h2>
      <p className="text-sm leading-6 text-zinc-500">
        รับการแจ้งเตือนผ่าน LINE เมื่อ{" "}
        <span className="font-medium text-zinc-700">หมดเวลาอด</span> และ{" "}
        <span className="font-medium text-zinc-700">หมดเวลากิน</span> —
        ถามครั้งเดียวตอนเข้าสู่ระบบครั้งแรกเท่านั้น
      </p>

      {status.loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#18A659] border-t-transparent" />
          กำลังตรวจสอบ...
        </div>
      ) : !status.onboarded ? (
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
      ) : !status.linked ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-500">
            LINE แจ้งเตือนปิดอยู่ — เปิดได้ทุกเมื่อเมื่อต้องการ
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
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {status.friend === true ? (
            <div className="rounded-xl bg-[#18A659]/10 px-4 py-3 text-sm font-medium text-[#148D4C]">
              ✓ LINE พร้อมส่งการแจ้งเตือนแล้ว
            </div>
          ) : status.friend === false ? (
            <>
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
                {status.working ? "กำลังตรวจสอบ..." : "เพิ่มเพื่อนแล้ว กดตรวจสอบ"}
              </button>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                ตรวจสอบสถานะ LINE ไม่สำเร็จชั่วคราว
              </div>
              <button
                type="button"
                onClick={refresh}
                disabled={status.working}
                className="w-full rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status.working ? "กำลังตรวจสอบ..." : "ลองตรวจสอบอีกครั้ง"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={disable}
            disabled={status.working}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status.working ? "กำลังปิด..." : "ปิด LINE แจ้งเตือน"}
          </button>
        </div>
      )}

      {status.message && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {status.message}
        </p>
      )}
    </section>
  );
}