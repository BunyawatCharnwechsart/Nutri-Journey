"use client";

import { useCallback, useEffect, useState } from "react";

// ============================================================================
// LINE แจ้งเตือน
//
// LINE user ids are identical across our login (LIFF) and OA channels because
// both belong to the same provider. The email of the account is bound server
// side at login (users.oa_user_id === users.line_user_id), so the ONLY thing a
// user must do to start receiving pushes is make the OA a friend. This
// component therefore never sends codes anymore — it just guides the user
// through the "add friend" step and reflects the real friendship state.
// ============================================================================

/** Public "Add friend" page of the OA (basic id @988yvqaz). */
const OA_ADD_FRIEND_URL = "https://line.me/R/ti/p/@988yvqaz";

const LINE_GRADIENT = {
  background: "linear-gradient(135deg, #06C755 0%, #18A659 100%)",
} as const;

interface LinkStatus {
  loading: boolean;
  working: boolean;
  linked: boolean;
  /** true = friend, false = not a friend, null = unknown/undeciable. */
  friend: boolean | null;
  message: string | null;
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
    friend: null,
    message: null,
  });

  /** Reads the friendship flag from the LIFF client (real-time, no server call). */
  const detectFriendship = useCallback(async (): Promise<boolean | null> => {
    try {
      const liff = await getLiff();
      if (!liff) {
        return null;
      }
      const result = await liff.getFriendship();
      return result.friendFlag;
    } catch {
      // getFriendship needs the "profile" scope; when it is unavailable we
      // fall back to the server's friendship answer from POST /link.
      return null;
    }
  }, []);

  // Load the notification state once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/line/link", { cache: "no-store" });
        const json = (await res.json()) as {
          success?: boolean;
          data?: { linked?: boolean };
        };
        if (cancelled) {
          return;
        }
        setStatus((prev) => ({
          ...prev,
          linked: Boolean(json.success && json.data?.linked),
          loading: false,
        }));

        const friend = await detectFriendship();
        if (!cancelled) {
          setStatus((prev) => ({ ...prev, friend }));
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
    })();
    return () => {
      cancelled = true;
    };
  }, [detectFriendship]);

  async function enable() {
    setStatus((prev) => ({ ...prev, working: true, message: null }));
    try {
      const res = await fetch("/api/v1/line/link", { method: "POST" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { linked?: boolean; friend?: boolean | null };
      };
      if (res.ok && json.success) {
        setStatus((prev) => ({
          ...prev,
          linked: true,
          friend: json.data?.friend ?? prev.friend,
          working: false,
        }));
      } else {
        setStatus((prev) => ({
          ...prev,
          working: false,
          message: "เปิดการแจ้งเตือนไม่สำเร็จ ลองอีกครั้ง",
        }));
      }
    } catch {
      setStatus((prev) => ({
        ...prev,
        working: false,
        message: "เชื่อมต่อไม่สำเร็จ ลองอีกครั้ง",
      }));
    }
  }

  async function disable() {
    setStatus((prev) => ({ ...prev, working: true, message: null }));
    try {
      const res = await fetch("/api/v1/line/link", { method: "DELETE" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { linked?: boolean };
      };
      setStatus((prev) => ({
        ...prev,
        linked: Boolean(res.ok && json.success && json.data?.linked),
        friend: null,
        working: false,
      }));
    } catch {
      setStatus((prev) => ({
        ...prev,
        working: false,
        message: "ปิดการแจ้งเตือนไม่สำเร็จ ลองอีกครั้ง",
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

  async function refresh() {
    setStatus((prev) => ({ ...prev, working: true, message: null }));
    const [friend, linkRes] = await Promise.all([
      detectFriendship(),
      fetch("/api/v1/line/link", { method: "POST" }),
    ]);
    let serverFriend: boolean | null = null;
    try {
      const json = (await linkRes.json()) as {
        success?: boolean;
        data?: { linked?: boolean; friend?: boolean | null };
      };
      if (linkRes.ok && json.success) {
        setStatus((prev) => ({ ...prev, linked: true }));
        serverFriend = json.data?.friend ?? null;
      }
    } catch {
      // ignore — friendship from the client still updates the state
    }
    setStatus((prev) => ({
      ...prev,
      friend: friend ?? serverFriend ?? prev.friend,
      working: false,
    }));
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">
        LINE แจ้งเตือน
      </h2>
      <p className="text-sm leading-6 text-zinc-500">
        รับการแจ้งเตือนผ่าน LINE เมื่อ{" "}
        <span className="font-medium text-zinc-700">หมดเวลาอด</span> และ{" "}
        <span className="font-medium text-zinc-700">หมดเวลากิน</span> — เพียง
        เพิ่ม LINE (NutriJourney) เป็นเพื่อนครั้งเดียว
      </p>

      {status.loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#18A659] border-t-transparent" />
          กำลังตรวจสอบ...
        </div>
      ) : !status.linked ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={enable}
            disabled={status.working}
            style={LINE_GRADIENT}
            className="w-full rounded-xl px-6 py-3 text-[16px] font-bold text-white transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status.working ? "กำลังเปิดใช้งาน..." : "เปิด LINE แจ้งเตือน"}
          </button>
          <p className="text-center text-xs text-zinc-400">
            กดเปิดแล้ว ระบบจะผูก LINE ให้อัตโนมัติ — ถ้ายังไม่เป็นเพื่อนกับ
            LINE (NutriJourney) ระบบจะพาไปเพิ่มเพื่อนให้ทีละขั้น
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {status.friend === true ? (
            <div className="rounded-xl bg-[#18A659]/10 px-4 py-3 text-sm font-medium text-[#148D4C]">
              ✓ LINE พร้อมส่งการแจ้งเตือนแล้ว
            </div>
          ) : (
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