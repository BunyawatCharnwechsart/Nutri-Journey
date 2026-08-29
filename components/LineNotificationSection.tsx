"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  readLastAttempt,
  shouldAutoAttempt,
  writeLastAttempt,
} from "@/lib/link-cooldown";

interface LinkStatus {
  linked: boolean | null;
  loading: boolean;
  working: boolean;
  message: string | null;
  pendingCode: string | null;
}

const LINE_GRADIENT = {
  background: "linear-gradient(135deg, #06C755 0%, #18A659 100%)",
} as const;

/** sessionStorage flag: resume an attach after liff.login() redirects back. */
const SESSION_PENDING_ATTACH_KEY = "nj_line_auto_attach";

const POLL_TURNS = 6;
const POLL_DELAY_MS = 2000;

/** Returns true/false when the server answered, null on network failure. */
async function fetchLinked(): Promise<boolean | null> {
  try {
    const res = await fetch("/api/v1/line/link", { cache: "no-store" });
    const json = (await res.json()) as {
      success?: boolean;
      data?: { linked?: boolean };
    };
    if (res.ok && json.success && json.data) {
      return json.data.linked ?? false;
    }
    return null;
  } catch {
    return null;
  }
}

export default function LineNotificationSection() {
  const [status, setStatus] = useState<LinkStatus>({
    linked: null,
    loading: true,
    working: false,
    message: null,
    pendingCode: null,
  });
  const [copied, setCopied] = useState(false);
  const [outsideLine, setOutsideLine] = useState(false);
  const runningRef = useRef(false);
  const runLinkFlowRef = useRef<typeof runLinkFlow>(() => Promise.resolve());

  /**
   * Creates a fresh [NJ-LINK] code, tries to send it automatically through the
   * LINE app and waits for the webhook to confirm the account binding.
   *
   * `auto` marks this as the background attempt: it respects the cooldown in
   * the mount effect and records the attempt so we do not spam the OA chat.
   */
  const runLinkFlow = useCallback(
    async function runLinkFlow({ auto = false }: { auto?: boolean } = {}) {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;

    const finish = (patch: Partial<LinkStatus>) => {
      setStatus((prev) => ({ ...prev, ...patch, working: false }));
      runningRef.current = false;
    };

    setStatus((prev) => ({
      ...prev,
      working: true,
      message: auto ? "กำลังเชื่อมต่อ LINE แจ้งเตือนอัตโนมัติ..." : null,
    }));

    try {
      const res = await fetch("/api/v1/line/link", { method: "POST" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { code?: string };
        error?: { message?: string };
      };

      if (!res.ok || !json.success || !json.data?.code) {
        finish({
          message: json.error?.message ?? "สร้างรหัสเชื่อมต่อไม่สำเร็จ",
        });
        return;
      }

      const code = json.data.code;
      if (auto) {
        writeLastAttempt();
      }
      setStatus((prev) => ({ ...prev, pendingCode: code }));

      // Get a ready-to-use liff instance (init only once).
      const liff = (await import("@line/liff")).default;
      const configuredLiffId = process.env.NEXT_PUBLIC_LIFF_ID;

      if (!configuredLiffId) {
        finish({ message: "ค่า LIFF ยังไม่ถูกตั้งค่า" });
        return;
      }

      let inClient = false;
      try {
        liff.isLoggedIn();
        inClient = liff.isInClient?.() ?? false;
      } catch {
        await liff.init({ liffId: configuredLiffId });
        inClient = liff.isInClient?.() ?? false;
      }

      if (!inClient) {
        // Outside the LINE app we cannot send a message — hide the code card
        // and let the user open the app inside LINE for a fully automatic link.
        setOutsideLine(true);
        finish({
          pendingCode: null,
          message:
            "เปิดแอปนี้ภายใน LINE แล้วระบบจะเชื่อมต่อ LINE แจ้งเตือนให้อัตโนมัติ",
        });
        return;
      }
      setOutsideLine(false);

      if (!liff.isLoggedIn()) {
        // Ask LINE for login first; when the user returns we resume via the
        // sessionStorage flag in the mount effect.
        try {
          sessionStorage.setItem(SESSION_PENDING_ATTACH_KEY, "1");
        } catch {
          // storage unavailable — the manual button is still available
        }
        finish({
          message: "กำลังเข้าสู่ระบบ LINE แล้วจะเชื่อมต่อให้อัตโนมัติ...",
        });
        liff.login();
        return;
      }

      // Send the code automatically through LINE.
      let autoSent = false;
      try {
        await liff.sendMessages([
          {
            type: "text",
            text: `[NJ-LINK] ${code}`,
          },
        ]);
        autoSent = true;
      } catch (error) {
        const raw = error instanceof Error ? error.message : "";
        if (raw.toLowerCase().includes("permission")) {
          finish({
            message:
              "LINE ยังไม่อนุญาตให้ส่งข้อความ — กดคัดลอกรหัสด้านล่างแล้ววางส่งในแชทกับ LINE (NutriJourney) แทน",
          });
          return;
        }
      }

      if (autoSent) {
        setStatus((prev) => ({
          ...prev,
          message: "ส่งรหัสให้ LINE เรียบร้อย กำลังรอระบบยืนยัน...",
        }));
      } else {
        // Auto-send failed for an unknown reason — keep the copy card as a
        // manual rescue instead of showing nothing.
        setStatus((prev) =>
          prev.message === null
            ? {
                ...prev,
                message:
                  "ส่งอัตโนมัติไม่ได้ — ใช้รหัสด้านล่างวางส่งในแชทกับ LINE (NutriJourney) ด้วยตนเอง",
              }
            : prev,
        );
      }

      // The webhook binds oa_user_id within a few seconds — poll briefly.
      for (let i = 0; i < POLL_TURNS; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS));
        const linked = await fetchLinked();
        if (linked === true) {
          finish({ linked: true, message: null, pendingCode: null });
          return;
        }
      }

      finish({
        message:
          "ยังไม่เห็นการยืนยัน — ตรวจสอบว่าได้เพิ่มเพื่อนกับ LINE (NutriJourney) แล้ว และมีรหัส [NJ-LINK] อยู่ในแชทหรือยัง",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      const permissionBlocked = msg.toLowerCase().includes("permission");
      finish({
        message: permissionBlocked
          ? "LINE ยังไม่อนุญาตให้ส่งข้อความ — กดคัดลอกรหัสด้านล่างแล้ววางส่งในแชทกับ LINE (NutriJourney) แทน"
          : "ไม่สามารถส่งข้อความได้ เปิดแอปนี้ภายใน LINE แล้วลองอีกครั้ง" +
            (msg ? ` (${msg})` : ""),
      });
    }
    },
    [],
  );

  // Keep the latest runLinkFlow instance available to the mount effect.
  useEffect(() => {
    runLinkFlowRef.current = runLinkFlow;
  }, [runLinkFlow]);

  // Load the link status and, when not linked yet, attempt the automatic link
  // once (either because this visit is outside the cooldown, or because the
  // user just returned from a liff.login() redirect).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const linked = await fetchLinked();
      if (cancelled) {
        return;
      }
      setStatus((prev) => ({ ...prev, linked, loading: false }));

      if (linked === true) {
        return;
      }

      let shouldAuto = false;
      try {
        if (sessionStorage.getItem(SESSION_PENDING_ATTACH_KEY) === "1") {
          sessionStorage.removeItem(SESSION_PENDING_ATTACH_KEY);
          shouldAuto = true;
        } else if (shouldAutoAttempt(readLastAttempt(), Date.now())) {
          shouldAuto = true;
        }
      } catch {
        // storage unavailable — stick to the manual button
      }

      if (shouldAuto) {
        setTimeout(() => {
          void runLinkFlowRef.current({ auto: true });
        }, 300);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function disconnect() {
    setStatus((prev) => ({ ...prev, working: true, message: null }));
    try {
      await fetch("/api/v1/line/link", { method: "DELETE" });
      const linked = await fetchLinked();
      setStatus((prev) => ({ ...prev, linked, loading: false }));
    } catch {
      setStatus((prev) => ({
        ...prev,
        message: "ตัดการเชื่อมต่อไม่สำเร็จ ลองอีกครั้ง",
      }));
    } finally {
      setStatus((prev) => ({ ...prev, working: false }));
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
        <span className="font-medium text-zinc-700">หมดเวลากิน</span> — ต้องมี
        บัญชีนี้เป็นเพื่อนกับ LINE (NutriJourney) ก่อน
      </p>

      {status.linked ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-[#18A659]/10 px-4 py-3 text-sm font-medium text-[#148D4C]">
            ✓ เชื่อมต่อ LINE แจ้งเตือนแล้ว
          </div>
          <button
            type="button"
            onClick={disconnect}
            disabled={status.working}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status.working ? "กำลังยกเลิก..." : "ตัดการเชื่อมต่อ"}
          </button>
        </div>
      ) : (
        !status.loading && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                void runLinkFlow();
              }}
              disabled={status.working}
              style={LINE_GRADIENT}
              className="w-full rounded-xl px-6 py-3 text-[16px] font-bold text-white transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status.working ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  กำลังเชื่อมต่อ...
                </span>
              ) : (
                "เชื่อมต่อ LINE เพื่อรับการแจ้งเตือน"
              )}
            </button>
            <p className="text-center text-xs text-zinc-400">
              เปิดแอปภายใน LINE ระบบจะผูกบัญชีให้อัตโนมัติ (อย่าลืม Add friend
              กับ LINE (NutriJourney) ก่อน)
            </p>
          </div>
        )
      )}

      {!status.linked && status.pendingCode && !outsideLine && (
        <div className="flex flex-col gap-2 rounded-xl bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            ผูกบัญชีด้วยตนเอง (ถ้าส่งอัตโนมัติไม่ได้)
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-sm text-zinc-800">
              [NJ-LINK] {status.pendingCode}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(`[NJ-LINK] ${status.pendingCode}`)
                  .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  })
                  .catch(() => {});
              }}
              className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
              {copied ? "คัดลอกแล้ว" : "คัดลอก"}
            </button>
          </div>
          <p className="text-xs leading-5 text-amber-700">
            เปิดแชทกับ LINE (NutriJourney) แล้ววาง/พิมพ์ข้อความนี้ส่ง —
            ระบบจะผูกบัญชีให้ภายในไม่กี่วินาที
          </p>
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