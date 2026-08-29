"use client";

import { useEffect, useState } from "react";

// ============================================================================
// จุดสถานะ LINE ที่มุมขวาของหัว Dashboard
//
// แสดงจุดสีเขียวเมื่อ LINE แจ้งเตือนพร้อมใช้งานจริง (ผูกบัญชีแล้ว,
// เปิดการแจ้งเตือนแล้ว และเป็นเพื่อนกับ OA แล้ว) — ดึงจาก
// GET /api/v1/line/link ฝั่ง server (คำตอบเดียวกันกับ LineNotificationSection)
// และฟัง event `line:link-state-changed` ให้อัปเดตทันทีเมื่อกดเปิด/ปิด/
// ตรวจสอบในหน้าคอมโพเนนต์หลัก โดยไม่ต้อง reload.
//
// สี: เขียว = พร้อมส่งการแจ้งเตือน, เทา = ยังไม่เชื่อมต่อ, ซ่อน = ยังไม่รู้ค่า.
// ============================================================================

/** ต้องตรงกับ LINE_STATUS_EVENT ใน LineNotificationSection.tsx */
const LINE_STATUS_EVENT = "line:link-state-changed";

export default function LineStatusDot() {
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/v1/line/link", { cache: "no-store" });
        const json = (await res.json()) as {
          success?: boolean;
          data?: { linked?: boolean; friend?: boolean | null };
        };
        const { linked, friend } = json.success ? json.data ?? {} : {};
        if (cancelled) {
          return;
        }
        setReady(Boolean(linked && friend === true));
        setLoaded(true);
      } catch {
        if (!cancelled) {
          setLoaded(false);
        }
      }
    };

    // Initial load + live updates after enable/disable/refresh.
    void load();
    window.addEventListener(LINE_STATUS_EVENT, load);

    return () => {
      cancelled = true;
      window.removeEventListener(LINE_STATUS_EVENT, load);
    };
  }, []);

  const label = ready
    ? "LINE แจ้งเตือนพร้อมใช้งาน"
    : "LINE แจ้งเตือนยังไม่ได้เชื่อมต่อ";

  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${
        ready
          ? "bg-[#18A659] ring-2 ring-[#18A659]/25"
          : loaded
            ? "bg-zinc-200 ring-1 ring-zinc-300"
            : "bg-transparent"
      }`}
    />
  );
}