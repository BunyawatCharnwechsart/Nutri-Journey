"use client";

import { useEffect, useState } from "react";

interface LinkStatus {
  linked: boolean | null;
  loading: boolean;
  working: boolean;
  message: string | null;
}

const LINE_GRADIENT = {
  background: "linear-gradient(135deg, #06C755 0%, #18A659 100%)",
} as const;

export default function LineNotificationSection() {
  const [status, setStatus] = useState<LinkStatus>({
    linked: null,
    loading: true,
    working: false,
    message: null,
  });

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const linked = await fetchLinked();
      if (!cancelled) {
        setStatus((prev) => ({ ...prev, linked, loading: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function connect() {
    setStatus((prev) => ({ ...prev, working: true, message: null }));

    try {
      const res = await fetch("/api/v1/line/link", { method: "POST" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { code?: string };
        error?: { message?: string };
      };

      if (!res.ok || !json.success || !json.data?.code) {
        setStatus((prev) => ({
          ...prev,
          message: json.error?.message ?? "สร้างรหัสเชื่อมต่อไม่สำเร็จ",
        }));
        return;
      }

      // Get a ready-to-use liff instance (init only once).
      const liff = (await import("@line/liff")).default;
      const configuredLiffId = process.env.NEXT_PUBLIC_LIFF_ID;

      if (!configuredLiffId) {
        setStatus((prev) => ({ ...prev, message: "ค่า LIFF ยังไม่ถูกตั้งค่า" }));
        return;
      }

      try {
        liff.isLoggedIn();
      } catch {
        await liff.init({ liffId: configuredLiffId });
      }

      await liff.sendMessages([
        {
          type: "text",
          text: `[NJ-LINK] ${json.data.code}`,
        },
      ]);

      setStatus((prev) => ({
        ...prev,
        message: "ส่งรหัสให้ LINE เรียบร้อย กำลังรอระบบยืนยัน..."
      }));

      // The webhook binds oa_user_id within a few seconds — poll briefly.
      for (let i = 0; i < 6; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const linked = await fetchLinked();
        if (linked === true) {
          setStatus((prev) => ({ ...prev, linked: true, message: null }));
          return;
        }
      }

      setStatus((prev) => ({
        ...prev,
        message:
          "ยังไม่เห็นการยืนยัน อาจยังไม่ได้เพิ่มเพื่อนกับ LINE (NutriJourney) — ตรวจสอบแชท LINE อีกครั้ง",
      }));
    } catch (error) {
      const msg =
        error instanceof Error && error.message
          ? error.message
          : "เกิดข้อผิดพลาด ลองอีกครั้ง";
      setStatus((prev) => ({
        ...prev,
        message:
          "ไม่สามารถส่งข้อความได้ เปิดแอปนี้ภายใน LINE แล้วลองอีกครั้ง (" +
          msg +
          ")",
      }));
    } finally {
      setStatus((prev) => ({ ...prev, working: false }));
    }
  }

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
              onClick={connect}
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
              เปิดแอปภายใน LINE แล้วกดปุ่มนี้ ระบบจะส่งรหัสผูกบัญชีเข้าแชท
              (อย่าลืม Add friend กับ LINE (NutriJourney) ก่อน)
            </p>
          </div>
        )
      )}

      {status.message && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {status.message}
        </p>
      )}
    </section>
  );
}