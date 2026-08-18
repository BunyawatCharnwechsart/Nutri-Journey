"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { getFastingMinutes, getIfPattern, IF_PATTERNS } from "@/lib/if";

interface IfSession {
  id: string;
  start_time: string;
  end_time: string | null;
  status: "active" | "completed";
  duration_minutes: number | null;
  if_pattern: string | null;
}

type View = "select" | "timer" | "success";

function formatClock(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const RING_SIZE = 200;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface FastingClockProps {
  timeText: string;
  caption: string;
  progress: number;
  reachedGoal?: boolean;
}

function FastingClock({
  timeText,
  caption,
  progress,
  reachedGoal = false,
}: FastingClockProps) {
  const dashOffset =
    RING_CIRCUMFERENCE *
    (1 - Math.max(0, Math.min(100, progress)) / 100);

  return (
    <div
      className="relative"
      style={{ width: RING_SIZE, height: RING_SIZE }}
      aria-hidden="true"
    >
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="#f4f4f5"
          strokeWidth={RING_STROKE}
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="#18A659"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span
          className={`text-4xl font-bold tabular-nums tracking-tight ${
            reachedGoal ? "text-[#18A659]" : "text-zinc-900"
          }`}
        >
          {timeText}
        </span>
        <span className="text-xs text-zinc-500">{caption}</span>
      </div>
    </div>
  );
}

export default function IfTracker() {
  const [view, setView] = useState<View>("select");
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [session, setSession] = useState<IfSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [patternModalOpen, setPatternModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    async function loadActiveSession() {
      try {
        const res = await fetch("/api/v1/if-sessions/active", {
          cache: "no-store",
        });
        const body = await res.json();
        if (body.success && body.data.session) {
          setSession(body.data.session);
          setView("timer");
        }
      } catch {
        setError("โหลดสถานะ IF ไม่สำเร็จ ลองอีกครั้ง");
      }
    }

    loadActiveSession();
  }, []);

  // Count-down ticker while a session is running.
  useEffect(() => {
    if (view !== "timer") {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [view]);

  async function startSession() {
    if (!selectedPattern) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/if-sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ifPattern: selectedPattern }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.error?.message ?? "เริ่ม Fasting ไม่สำเร็จ");
        return;
      }
      setSession(body.data.session);
      setNow(Date.now());
      setView("timer");
    } catch {
      setError("เริ่ม Fasting ไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  async function endSession() {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/if-sessions/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.error?.message ?? "สิ้นสุด Fasting ไม่สำเร็จ");
        setConfirmEnd(false);
        return;
      }
      setSession(body.data.session);
      setConfirmEnd(false);
      setView("success");
    } catch {
      setError("สิ้นสุด Fasting ไม่สำเร็จ ลองอีกครั้ง");
      setConfirmEnd(false);
    } finally {
      setLoading(false);
    }
  }

  async function cancelSession() {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/if-sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.error?.message ?? "ยกเลิกไม่สำเร็จ");
        return;
      }
      setSession(null);
      setSelectedPattern(null);
      setView("select");
    } catch {
      setError("ยกเลิกไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  const activePattern = session ? getIfPattern(session.if_pattern) : null;
  const plannedMinutes = activePattern ? getFastingMinutes(activePattern.value) : 0;
  const selectedMinutes = selectedPattern
    ? getFastingMinutes(selectedPattern)
    : 0;

  const elapsedMs = session ? now - new Date(session.start_time).getTime() : 0;
  const remainingMs = plannedMinutes * 60000 - elapsedMs;
  const reachedGoal = remainingMs <= 0;

  const progress =
    plannedMinutes > 0
      ? Math.min(100, Math.round((elapsedMs / (plannedMinutes * 60000)) * 100))
      : 0;

  const subheader =
    view === "timer"
      ? `กำลังทำ IF รูปแบบ ${activePattern?.label ?? "IF"}`
      : view === "success"
        ? "ทำ IF สำเร็จ!"
        : selectedPattern
          ? `ทำ IF รูปแบบ ${getIfPattern(selectedPattern)?.label ?? "IF"}`
          : "เลือกการทำ IF ที่เหมาะสมกับคุณ";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-center text-sm leading-6 text-zinc-500">
        {subheader}
      </p>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {view === "select" && (
        <section className="flex flex-col items-center gap-8">
          <FastingClock
            timeText={
              selectedMinutes > 0 ? formatClock(selectedMinutes * 60000) : "0:00:00"
            }
            caption={
              selectedMinutes > 0 ? "เป้าหมายการทำ IF" : "ยังไม่ได้เลือกการทำ IF"
            }
            progress={0}
          />

          <button
            type="button"
            onClick={() => setPatternModalOpen(true)}
            style={{
              background: "linear-gradient(135deg, #18A659 0%, #26BA6A 100%)",
            }}
            className="w-full rounded-xl px-6 py-3 text-lg font-bold text-white transition-[filter] hover:brightness-105"
          >
            {selectedPattern
              ? getIfPattern(selectedPattern)?.label ?? "เลือกรูปแบบ IF"
              : "เลือกรูปแบบ IF"}
          </button>

          {selectedPattern && (
            <button
              type="button"
              onClick={startSession}
              disabled={loading}
              className="w-full rounded-full bg-[#18A659] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "กำลังเริ่ม..." : "เริ่ม Fasting"}
            </button>
          )}
        </section>
      )}

      {view === "timer" && session && (
        <section className="flex flex-col items-center gap-6 text-center">
          <FastingClock
            timeText={reachedGoal ? "ครบเป้า!" : formatClock(remainingMs)}
            caption={reachedGoal ? "ทำตามเป้าหมายสำเร็จ" : "เวลาที่เหลือ"}
            progress={progress}
            reachedGoal={reachedGoal}
          />

          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={() => setConfirmEnd(true)}
              disabled={loading}
              className="rounded-full bg-[#18A659] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:opacity-50"
            >
              สิ้นสุด Fasting
            </button>
            <button
              type="button"
              onClick={cancelSession}
              disabled={loading}
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
            >
              ยกเลิกเซสชันนี้
            </button>
          </div>
        </section>
      )}

      {view === "success" && session && (
        <section className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#18A659]/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#18A659"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-8 w-8"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">
              ทำ IF สำเร็จ!
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              รูปแบบ {activePattern?.label ?? "IF"} · ทำได้{" "}
              {formatClock(elapsedMs)}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-[#18A659] px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#148D4C]"
            >
              ไปหน้า Dashboard
            </Link>
            <button
              type="button"
              onClick={() => {
                setSession(null);
                setSelectedPattern(null);
                setView("select");
              }}
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              เริ่ม Fasting ใหม่
            </button>
          </div>
        </section>
      )}

      {patternModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          role="dialog"
          aria-modal="true"
          aria-label="เลือกรูปแบบ IF"
        >
          <div className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-white p-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                เลือกรูปแบบ IF
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                เลือกรูปแบบการทำ IF ที่เหมาะกับคุณ
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {IF_PATTERNS.map((pattern) => {
                const isSelected = selectedPattern === pattern.value;
                return (
                  <button
                    key={pattern.value}
                    type="button"
                    onClick={() => {
                      setSelectedPattern(pattern.value);
                      setPatternModalOpen(false);
                    }}
                    style={{
                      background:
                        "linear-gradient(135deg, #18A659 0%, #26BA6A 100%)",
                    }}
                    className={`flex flex-col gap-1 rounded-xl px-4 py-3 text-left text-white transition-[filter] ${
                      isSelected
                        ? "ring-2 ring-[#18A659] ring-offset-2"
                        : "hover:brightness-105"
                    }`}
                  >
                    <span className="text-lg font-bold">{pattern.label}</span>
                    <span className="text-sm text-white/80">
                      {pattern.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setPatternModalOpen(false)}
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {confirmEnd && session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-white p-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                สิ้นสุด Fasting?
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                คุณได้อดอาหารมาแล้ว{" "}
                {formatClock(Math.max(0, now - new Date(session.start_time).getTime()))}{" "}
                ต้องการบันทึกและสิ้นสุดหรือไม่?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={endSession}
                disabled={loading}
                className="rounded-full bg-[#18A659] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:opacity-50"
              >
                {loading ? "กำลังบันทึก..." : "สิ้นสุด Fasting"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                disabled={loading}
                className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
              >
                ยังไม่สิ้นสุด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}