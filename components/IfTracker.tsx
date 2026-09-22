"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import ConfirmEndModal from "@/components/ConfirmEndModal";
import EditTimeModal from "@/components/EditTimeModal";
import PatternPickerModal from "@/components/PatternPickerModal";
import {
  formatMinutes,
  getEatingMinutes,
  getFastingMinutes,
  getIfPattern,
  getMoodLevel,
  IfSession,
  type MoodValue,
  wouldMissFastingGoal,
} from "@/lib/if";
import { dayStatusForSession } from "@/lib/calendar";
import { fromICTWallClock, toICT } from "@/lib/timezone";

type View = "select" | "timer" | "success";
type Phase = "eating" | "fasting";

/** Shared brand gradient so every primary button looks identical. */
const PRIMARY_GRADIENT = {
  background: "linear-gradient(135deg, #18A659 0%, #26BA6A 100%)",
} as const;

/** Fasting gradient used for fasting phase buttons. */
const FASTING_GRADIENT = {
  background: "linear-gradient(135deg, #DC8426 0%, #E69B4B 100%)",
} as const;

function formatClock(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Formats a timestamp as a Thai date + 24-hour time, e.g. "25/08/2026 เวลา 14:30 น.". */
function formatThaiDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  const ict = toICT(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(ict.getUTCDate())}/${pad(ict.getUTCMonth() + 1)}/${ict.getUTCFullYear()} เวลา ${pad(ict.getUTCHours())}:${pad(ict.getUTCMinutes())} น.`;
}

/**
 * Small wrapper around fetch for our API envelope ({ success, data|error }).
 * Returns a flat result so callers only deal with ok/data/message.
 */
async function requestApi<T>(
  url: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  payload?: unknown
): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: payload === undefined ? undefined : { "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      cache: "no-store",
    });
    const json = (await res.json()) as {
      success?: boolean;
      data?: T;
      error?: { message?: string };
    };

    if (!res.ok || !json.success || json.data === undefined) {
      return { ok: false, message: json.error?.message };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false };
  }
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
  ringColor?: string;
  /** Screen-reader summary, worded so it only changes once per minute. */
  srSummary?: string;
}

function FastingClock({
  timeText,
  caption,
  progress,
  reachedGoal = false,
  ringColor = "#18A659",
  srSummary,
}: FastingClockProps) {
  const dashOffset =
    RING_CIRCUMFERENCE *
    (1 - Math.max(0, Math.min(100, progress)) / 100);

  return (
    <div
      className="relative"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90" aria-hidden="true">
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
          stroke={ringColor}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>
      {/* The per-second number is visual only; screen readers get srSummary. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span
          aria-hidden="true"
          className={`text-4xl font-bold tabular-nums tracking-tight ${
            reachedGoal ? "text-[#18A659]" : "text-zinc-900"
          }`}
        >
          {timeText}
        </span>
        <span className="text-xs text-zinc-500">{caption}</span>
        {srSummary && (
          <span role="status" className="sr-only">
            {srSummary}
          </span>
        )}
      </div>
    </div>
  );
}

function TimerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 29 29"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M6.68508 18.4442C6.23279 17.3522 6 16.1819 6 15C6 12.6131 6.94821 10.3239 8.63604 8.63604C10.3239 6.94821 12.6131 6 15 6C17.3869 6 19.6761 6.94821 21.364 8.63604C23.0518 10.3239 24 12.6131 24 15C24 16.1819 23.7672 17.3522 23.3149 18.4442C22.8626 19.5361 22.1997 20.5282 21.364 21.364C20.5282 22.1997 19.5361 22.8626 18.4442 23.3149C17.3522 23.7672 16.1819 24 15 24C13.8181 24 12.6478 23.7672 11.5558 23.3149C10.4639 22.8626 9.47177 22.1997 8.63604 21.364C7.80031 20.5282 7.13738 19.5361 6.68508 18.4442Z" />
      <path d="M15 10V15L18 18" />
    </svg>
  );
}

interface PhaseCardProps {
  label: string;
  startTime: string;
  remainingMs: number;
  accent: string;
}

function PhaseCard({ label, startTime, remainingMs, accent }: PhaseCardProps) {
  return (
    <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)]">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${accent}1A`, color: accent }}
      >
        <TimerIcon className="h-6 w-6" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-base font-bold text-zinc-900">{label}</span>
        <span className="text-xs text-zinc-500">
          {formatThaiDateTime(startTime)}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-xs text-zinc-500">เหลือ</span>
        <span
          className="text-lg font-bold tabular-nums"
          style={{ color: accent }}
        >
          {formatClock(remainingMs)}
        </span>
      </div>
    </div>
  );
}

export default function IfTracker({
  allowEditTime = true,
}: {
  /** Whether the "แก้ไขช่วงเวลา" (edit time) button is shown. Defaults to true. */
  allowEditTime?: boolean;
}) {
  const [view, setView] = useState<View>("select");
  const [mode, setMode] = useState<Phase>("eating");
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [session, setSession] = useState<IfSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [editTimeOpen, setEditTimeOpen] = useState(false);
  const [editTimeDate, setEditTimeDate] = useState("");
  const [editTimeTime, setEditTimeTime] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editTimeWarning, setEditTimeWarning] = useState<string | null>(null);
  const [editTimeWarned, setEditTimeWarned] = useState(false);
  const [patternModalOpen, setPatternModalOpen] = useState(false);
  const [pendingPattern, setPendingPattern] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** อารมณ์ที่เลือกก่อนกด "สิ้นสุดการกิน" - ส่งไปกับ POST /end. */
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Stable closers so the Modal listeners are not re-bound on every tick.
  const closePatternModal = useCallback(() => setPatternModalOpen(false), []);
  const closeConfirmEnd = useCallback(() => setConfirmEnd(false), []);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    async function loadActiveSession() {
      const result = await requestApi<{ session: IfSession | null }>(
        "/api/v1/if-sessions/active",
        "GET"
      );
      setInitializing(false);

      if (!result.ok) {
        setError("โหลดสถานะ IF ไม่สำเร็จ ลองอีกครั้ง");
        return;
      }
      if (result.data?.session) {
        setSession(result.data.session);
        setMode(result.data.session.fasting_end_time ? "eating" : "fasting");
        setView("timer");
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
    const result = await requestApi<{ session: IfSession }>(
      "/api/v1/if-sessions/start",
      "POST",
      { ifPattern: selectedPattern }
    );
    setLoading(false);

    if (!result.ok || !result.data) {
      setError(result.message ?? "เริ่ม IF ไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    setSession(result.data.session);
    setNow(Date.now());
    setMode("fasting");
    setView("timer");
  }

  async function endFasting() {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);
    const result = await requestApi<{ session: IfSession }>(
      "/api/v1/if-sessions/end-eating",
      "POST",
      { sessionId: session.id }
    );
    setLoading(false);

    if (!result.ok || !result.data) {
      setError(result.message ?? "สิ้นสุดการอดไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    setSession(result.data.session);
    setNow(Date.now());
    setMode("eating");
  }

  async function endSession() {
    if (!session) {
      return;
    }
    if (selectedMood === null) {
      setError("กรุณาเลือกอารมณ์ก่อนสิ้นสุด");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await requestApi<{ session: IfSession }>(
      "/api/v1/if-sessions/end",
      "POST",
      { sessionId: session.id, mood: selectedMood }
    );
    setLoading(false);

    if (!result.ok || !result.data) {
      setError(result.message ?? "สิ้นสุด Fasting ไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    setSession(result.data.session);
    setConfirmEnd(false);
    setView("success");
  }

  function openEditTimeModal() {
    if (!session) return;
    const target = new Date(
      mode === "fasting"
        ? session.fasting_start_time
        : session.eating_start_time!
    );
    if (Number.isNaN(target.getTime())) {
      return;
    }
    const ict = toICT(target);
    const pad = (n: number) => String(n).padStart(2, "0");
    setEditTimeDate(
      `${ict.getUTCFullYear()}-${pad(ict.getUTCMonth() + 1)}-${pad(
        ict.getUTCDate()
      )}`
    );
    setEditTimeTime(`${pad(ict.getUTCHours())}:${pad(ict.getUTCMinutes())}`);
    setEditError(null);
    setEditTimeWarning(null);
    setEditTimeWarned(false);
    setEditTimeOpen(true);
  }

  async function saveEditedTime() {
    if (!session || !editTimeDate || !editTimeTime) return;

    let newStart: Date;
    try {
      newStart = fromICTWallClock(editTimeDate, editTimeTime);
    } catch {
      setEditError("วันที่หรือเวลาไม่ถูกต้อง");
      return;
    }

    // ไม่อนุญาตเวลาในอนาคต และไม่ย้อนวันให้อัตโนมัติ — ผู้ใช้ต้องเลือกวันที่จริง
    // เอง (แก้ไขที่ซ่อนอยู่เดิม: เลือกเวลาที่เลยตอนนี้ไปนิดเดียวแล้วถูกเลื่อน
    // ย้อนหลังทั้งวันเงียบๆ ทำให้ระยะอดในสรุปเพี้ยนจากเวลาจริง).
    if (newStart.getTime() > Date.now()) {
      setEditError("เวลาที่เลือกยังมาไม่ถึง (เลือกวันที่/เวลา ที่ผ่านไปแล้ว)");
      return;
    }

    // ตอน eating phase การแก้ "เวลาเริ่มกิน" เท่ากับเลื่อนจุดที่อดสิ้นสุดด้วย
    // → คำนวณการอดใหม่ให้เห็นก่อน เช่น ถ้าจะสั้นลงจนไม่ถึงเป้า session จะ fail.
    if (mode === "eating") {
      const fastingStartMs = new Date(session.fasting_start_time).getTime();
      const newFastingEndMs = newStart.getTime();
      if (newFastingEndMs < fastingStartMs) {
        setEditError("เวลากินไม่สามารถเกิดก่อนเวลาเริ่มอดได้");
        return;
      }
      const prospectiveFasting = Math.round(
        (newFastingEndMs - fastingStartMs) / 60000
      );
      if (
        wouldMissFastingGoal(session.if_pattern, prospectiveFasting) &&
        !editTimeWarned
      ) {
        const plannedFasting = getFastingMinutes(session.if_pattern);
        setEditTimeWarning(
          `การอดจะถูกบันทึกเป็น ${formatMinutes(
            prospectiveFasting
          )} (เป้า ${formatMinutes(
            plannedFasting
          )}) — ถ้าบันทึกผลจะแสดงเป็น "ไม่สำเร็จ" กด "บันทึกเวลา" อีกครั้งเพื่อยืนยัน`
        );
        setEditTimeWarned(true);
        return;
      }
      setEditTimeWarning(null);
    }

    setLoading(true);
    setEditError(null);
    const result = await requestApi<{ session: IfSession }>(
      "/api/v1/if-sessions/edit-time",
      "PATCH",
      { sessionId: session.id, newStartTime: newStart.toISOString() }
    );
    setLoading(false);

    if (!result.ok || !result.data) {
      setEditError(result.message ?? "แก้ไขเวลาไม่สำเร็จ ลองอีกครั้ง");
      return;
    }

    setSession(result.data.session);
    setEditError(null);
    setEditTimeWarning(null);
    setEditTimeOpen(false);
  }

  function resetToSelect() {
    setSession(null);
    setSelectedPattern(null);
    setSelectedMood(null);
    setMode("eating");
    setView("select");
  }

  const activePattern = session ? getIfPattern(session.if_pattern) : null;
  const sessionMood = session ? getMoodLevel(session.mood) : null;
  // ใช้ logic เดียวกับปฏิทิน (dayStatusForSession) เพื่อให้ success screen บอกผล
  // ตรงกับสี/สถานะที่แสดงบนปฏิทินเสมอ: success = อดครบ + กินครบตาม pattern.
  const isSuccess = session
    ? dayStatusForSession(session) === "success"
    : false;
  const plannedMinutes = activePattern ? getFastingMinutes(activePattern.value) : 0;
  const eatingMinutes = activePattern ? getEatingMinutes(activePattern.value) : 0;
  const selectedMinutes = selectedPattern
    ? getFastingMinutes(selectedPattern)
    : 0;

  const sessionStartMs = session
    ? new Date(session.fasting_start_time).getTime()
    : 0;
  const eatingStartMs = session?.eating_start_time
    ? new Date(session.eating_start_time).getTime()
    : sessionStartMs;

  const fastingElapsedMs = session ? Math.max(0, now - sessionStartMs) : 0;
  const eatingElapsedMs = session ? Math.max(0, now - eatingStartMs) : 0;

  const eatingRemainingMs = eatingMinutes * 60000 - eatingElapsedMs;
  const fastingRemainingMs = plannedMinutes * 60000 - fastingElapsedMs;
  const reachedGoal =
    plannedMinutes > 0 && fastingElapsedMs >= plannedMinutes * 60000;
  const eatingExpired = mode === "eating" && eatingMinutes > 0 && eatingRemainingMs <= 0;

  const progress =
    mode === "fasting"
      ? plannedMinutes > 0
        ? Math.min(
            100,
            Math.round((fastingElapsedMs / (plannedMinutes * 60000)) * 100)
          )
        : 0
      : eatingMinutes > 0
        ? Math.min(
            100,
            Math.round((eatingElapsedMs / (eatingMinutes * 60000)) * 100)
          )
        : 0;

  // Quantised to minutes so the screen-reader status does not fire every second.
  const elapsedMinutes = Math.floor(
    (mode === "fasting" ? fastingElapsedMs : eatingElapsedMs) / 60000
  );
  const srSummary =
    view === "timer" && session
      ? mode === "fasting"
        ? reachedGoal
          ? "อดครบตามเป้าหมายแล้ว"
          : `กำลังอดอาหาร ผ่านมาแล้ว ${elapsedMinutes} นาที`
        : `กำลังกินอาหาร ผ่านมาแล้ว ${elapsedMinutes} นาที`
      : undefined;

  const subheader = initializing
    ? "กำลังโหลดสถานะ IF..."
    : view === "timer"
      ? mode === "fasting"
        ? `กำลังอดอาหาร - ${activePattern?.label ?? "IF"}`
        : "กำลังกินอาหาร"
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

      {initializing && (
        <section
          aria-busy="true"
          className="flex flex-col items-center gap-6 py-10"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-zinc-200 border-t-[#18A659]" />
        </section>
      )}

      {!initializing && error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {!initializing && view === "select" && (
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
            onClick={() => {
              setPendingPattern(selectedPattern);
              setPatternModalOpen(true);
            }}
            style={PRIMARY_GRADIENT}
            className="w-full rounded-xl px-6 py-3 text-[20px] font-bold text-white transition-[filter] hover:brightness-105"
          >
            {selectedPattern
              ? "เปลี่ยนรูปแบบ IF"
              : "เลือกรูปแบบ IF"}
          </button>

          {selectedPattern && (
            <button
              type="button"
              onClick={startSession}
              disabled={loading}
              style={FASTING_GRADIENT}
              className="w-full rounded-xl px-6 py-3 text-[20px] font-bold text-white transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "กำลังเริ่ม..." : "เริ่ม IF"}
            </button>
          )}
        </section>
      )}

      {!initializing && view === "timer" && session && (
        <section className="flex flex-col items-center gap-6 text-center">
          <FastingClock
            timeText={
              mode === "fasting"
                ? formatClock(fastingElapsedMs)
                : formatClock(eatingElapsedMs)
            }
            caption={
              mode === "fasting"
                ? reachedGoal
                  ? "อดครบตามเป้าหมายแล้ว"
                  : "กำลังอดอาหาร"
                : eatingExpired
                  ? "หมดเวลากินตามแผนแล้ว"
                  : "กำลังกินอาหาร"
            }
            progress={progress}
            reachedGoal={mode === "fasting" && reachedGoal}
            ringColor={mode === "fasting" ? "#DC8426" : "#18A659"}
            srSummary={srSummary}
          />

          {mode === "fasting" ? (
            <PhaseCard
              label="เริ่มการอด"
              startTime={session.fasting_start_time}
              remainingMs={fastingRemainingMs}
              accent="#DC8426"
            />
          ) : (
            <PhaseCard
              label="เริ่มการกิน"
              startTime={session.eating_start_time ?? session.fasting_start_time}
              remainingMs={eatingRemainingMs}
              accent="#18A659"
            />
          )}

          <div className="flex w-full flex-col gap-3">
            {mode === "fasting" ? (
              <button
                type="button"
                onClick={endFasting}
                disabled={loading}
                style={FASTING_GRADIENT}
                className="w-full rounded-xl px-6 py-3 text-[20px] font-bold text-white transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "กำลังบันทึก..." : "สิ้นสุดการอด"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmEnd(true)}
                disabled={loading}
                style={PRIMARY_GRADIENT}
                className="w-full rounded-xl px-6 py-3 text-[20px] font-bold text-white transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                สิ้นสุดการกิน
              </button>
            )}
            {allowEditTime && mode === "fasting" && (
              <button
                type="button"
                onClick={openEditTimeModal}
                disabled={loading}
                className="w-full rounded-2xl border border-zinc-300 px-6 py-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
              >
                แก้ไขช่วงเวลา
              </button>
            )}
          </div>
        </section>
      )}

      {!initializing && view === "success" && session && (
        <section className="flex flex-col items-center gap-6 text-center">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              isSuccess ? "bg-[#18A659]/10" : "bg-[#FFAE00]/10"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke={isSuccess ? "#18A659" : "#FFAE00"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-8 w-8"
            >
              {isSuccess ? (
                <path d="M20 6L9 17l-5-5" />
              ) : (
                <>
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </>
              )}
            </svg>
          </div>
          <div>
            <h2
              className={`text-xl font-bold ${
                isSuccess ? "text-zinc-900" : "text-[#B45309]"
              }`}
            >
              {isSuccess ? "ทำ IF สำเร็จ!" : "ไม่ถึงเป้าหมาย"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {isSuccess
                ? "อดครบและกินครบตามแผนที่เลือก"
                : "อดได้ไม่ถึงเป้าหมายของรูปแบบที่เลือก"}
            </p>
            <div className="mt-1 flex flex-col items-center gap-1 text-sm text-zinc-500">
              <span>รูปแบบ {activePattern?.label ?? "IF"}</span>
              <span>อด {formatMinutes(session.fasting_duration_minutes)}</span>
              <span>กิน {formatMinutes(session.eating_duration_minutes)}</span>
              <span className="font-medium text-zinc-700">
                รวม{" "}
                {formatMinutes(
                  (session.fasting_duration_minutes ?? 0) +
                    (session.eating_duration_minutes ?? 0)
                )}
              </span>
            </div>
          </div>
          {sessionMood && (
            <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full"
              >
                <Image
                  src={sessionMood.icon}
                  alt=""
                  width={20}
                  height={20}
                  className="h-full w-full"
                />
              </span>
              <span className="text-sm font-medium text-zinc-700">
                อารมณ์วันนี้: {sessionMood.labelThai}
              </span>
            </div>
          )}
          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={resetToSelect}
              style={PRIMARY_GRADIENT}
              className="w-full rounded-full px-6 py-3 text-sm font-semibold text-white transition-[filter] hover:brightness-105"
            >
              เริ่ม IF ใหม่
            </button>
            <Link
              href="/stats?range=calendar"
              className="rounded-full border border-zinc-300 px-6 py-3 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              ไปหน้าสถิติ
            </Link>
          </div>
        </section>
      )}

      {patternModalOpen && (
        <PatternPickerModal
          value={pendingPattern}
          disabled={loading}
          onChange={setPendingPattern}
          onConfirm={() => {
            if (pendingPattern) {
              setSelectedPattern(pendingPattern);
            }
            closePatternModal();
          }}
          onClose={closePatternModal}
        />
      )}

      {confirmEnd && session && (
        <ConfirmEndModal
          eatingElapsedText={formatClock(eatingElapsedMs)}
          selectedMood={selectedMood}
          onSelectMood={setSelectedMood}
          loading={loading}
          error={error}
          onConfirm={endSession}
          onClose={closeConfirmEnd}
        />
      )}

      {editTimeOpen && session && (
        <EditTimeModal
          dateValue={editTimeDate}
          timeValue={editTimeTime}
          mode={mode}
          onTimeChange={(value) => {
            setEditTimeTime(value);
            setEditTimeWarning(null);
            setEditTimeWarned(false);
          }}
          loading={loading}
          error={editError}
          warning={editTimeWarning}
          onSave={saveEditedTime}
          onClose={() => setEditTimeOpen(false)}
        />
      )}
    </div>
  );
}
