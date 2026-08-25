"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

import {
  formatMinutes,
  getEatingMinutes,
  getFastingMinutes,
  getIfPattern,
  IfSession,
  IF_PATTERNS,
} from "@/lib/if";

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

/** Formats a timestamp as a Thai date + 24-hour time, e.g. "25/08/2026 14:30 น.". */
function formatThaiTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes} น.`;
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

interface PhaseCardProps {
  label: string;
  startTime: string;
  remainingMs: number;
  accent: string;
  expired?: boolean;
}

function PhaseCard({ label, startTime, remainingMs, accent, expired = false }: PhaseCardProps) {
  return (
    <div className="flex w-full flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-4 text-center">
      <span className="text-sm text-zinc-500">
        {label} · {startTime}
      </span>
      {expired ? (
        <span className="text-lg font-bold text-red-600">
          หมดเวลาที่วางไว้แล้ว — กดสิ้นสุดเพื่อเริ่มอด
        </span>
      ) : (
        <span className="text-lg font-bold tabular-nums" style={{ color: accent }}>
          เหลือ {formatClock(remainingMs)}
        </span>
      )}
    </div>
  );
}

interface ModalProps {
  ariaLabel: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Bottom-sheet-style dialog: closes on Escape or backdrop click, focuses the
 * panel so keyboard users land inside it.
 */
function Modal({ ariaLabel, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-6 sm:items-center"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-white p-6 outline-none"
      >
        {children}
      </div>
    </div>
  );
}

export default function IfTracker() {
  const [view, setView] = useState<View>("select");
  const [mode, setMode] = useState<Phase>("eating");
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [session, setSession] = useState<IfSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [editTimeOpen, setEditTimeOpen] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState("");
  const [patternModalOpen, setPatternModalOpen] = useState(false);
  const [pendingPattern, setPendingPattern] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  const closeConfirmCancel = useCallback(() => setConfirmCancel(false), []);

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
    setLoading(true);
    setError(null);
    const result = await requestApi<{ session: IfSession }>(
      "/api/v1/if-sessions/end",
      "POST",
      { sessionId: session.id }
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
    const targetDate = new Date(
      mode === "fasting"
        ? session.fasting_start_time
        : session.eating_start_time!
    );
    const hh = String(targetDate.getHours()).padStart(2, "0");
    const mm = String(targetDate.getMinutes()).padStart(2, "0");
    setEditTimeValue(`${hh}:${mm}`);
    setEditTimeOpen(true);
  }

  async function saveEditedTime() {
    if (!session || !editTimeValue) return;

    const baseDate = new Date(
      mode === "fasting"
        ? session.fasting_start_time
        : session.eating_start_time!
    );
    
    const [hours, minutes] = editTimeValue.split(":").map(Number);
    baseDate.setHours(hours, minutes, 0, 0);

    if (baseDate.getTime() > Date.now()) {
      baseDate.setDate(baseDate.getDate() - 1);
    }

    setLoading(true);
    setError(null);
    const result = await requestApi<{ session: IfSession }>(
      "/api/v1/if-sessions/edit-time",
      "PATCH",
      { sessionId: session.id, newStartTime: baseDate.toISOString() }
    );
    setLoading(false);

    if (!result.ok || !result.data) {
      setError(result.message ?? "แก้ไขเวลาไม่สำเร็จ ลองอีกครั้ง");
      return;
    }

    setSession(result.data.session);
    setEditTimeOpen(false);
  }

  async function cancelSession() {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);
    const result = await requestApi(
      "/api/v1/if-sessions",
      "DELETE",
      { sessionId: session.id }
    );
    setLoading(false);

    if (!result.ok) {
      setError(result.message ?? "ยกเลิกไม่สำเร็จ ลองอีกครั้ง");
      return;
    }
    setConfirmCancel(false);
    setSession(null);
    setSelectedPattern(null);
    setMode("eating");
    setView("select");
  }

  function resetToSelect() {
    setSession(null);
    setSelectedPattern(null);
    setMode("eating");
    setView("select");
  }

  const activePattern = session ? getIfPattern(session.if_pattern) : null;
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
        ? `กำลังอดอาหาร — ${activePattern?.label ?? "IF"}`
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
              startTime={formatThaiTime(session.fasting_start_time)}
              remainingMs={fastingRemainingMs}
              accent="#DC8426"
            />
          ) : (
            <PhaseCard
              label="เริ่มการกิน"
              startTime={formatThaiTime(
                session.eating_start_time ?? session.fasting_start_time
              )}
              remainingMs={eatingRemainingMs}
              accent="#18A659"
              expired={eatingExpired}
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
            <button
              type="button"
              onClick={openEditTimeModal}
              disabled={loading}
              className="w-full rounded-2xl border border-zinc-300 px-6 py-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
            >
              แก้ไขช่วงเวลา
            </button>
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              disabled={loading}
              className="w-full rounded-2xl border border-zinc-300 px-6 py-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
            >
              ยกเลิกเซสชันนี้
            </button>
          </div>
        </section>
      )}

      {!initializing && view === "success" && session && (
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
              รูปแบบ {activePattern?.label ?? "IF"} · อด{" "}
              {formatMinutes(session.fasting_duration_minutes)} · กิน{" "}
              {formatMinutes(session.eating_duration_minutes)} · รวม{" "}
              {formatMinutes(
                (session.fasting_duration_minutes ?? 0) +
                  (session.eating_duration_minutes ?? 0)
              )}
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
              onClick={resetToSelect}
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              เริ่ม Fasting ใหม่
            </button>
          </div>
        </section>
      )}

      {patternModalOpen && (
        <Modal ariaLabel="เลือกรูปแบบ IF" onClose={closePatternModal}>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              เลือกรูปแบบ IF
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              เลือกแล้วกดบันทึกเพื่อยืนยัน
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {IF_PATTERNS.map((pattern) => {
              const isSelected = pendingPattern === pattern.value;
              return (
                <button
                  key={pattern.value}
                  type="button"
                  onClick={() => setPendingPattern(pattern.value)}
                  aria-pressed={isSelected}
                  className={`flex flex-col gap-1 rounded-xl bg-white px-4 py-3 text-left text-black ${
                    isSelected
                      ? "ring-2 ring-[#000000] ring-offset-2"
                      : "border border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <span className="text-lg font-bold">{pattern.label}</span>
                  <span className="text-sm text-black">
                    {pattern.description}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!pendingPattern || loading}
            onClick={() => {
              if (pendingPattern) {
                setSelectedPattern(pendingPattern);
              }
              closePatternModal();
            }}
            className="rounded-xl px-6 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={PRIMARY_GRADIENT}
          >
            บันทึกรูปแบบ IF
          </button>
        </Modal>
      )}

      {confirmEnd && session && (
        <Modal ariaLabel="ยืนยันสิ้นสุดการกิน" onClose={closeConfirmEnd}>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              สิ้นสุดการกิน?
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              คุณได้กินอาหารมาแล้ว{" "}
              {formatClock(eatingElapsedMs)}{" "}
              ต้องการบันทึกและสิ้นสุดหรือไม่?
            </p>
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={endSession}
              disabled={loading}
              className="rounded-full bg-[#18A659] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : "สิ้นสุดการกิน"}
            </button>
            <button
              type="button"
              onClick={closeConfirmEnd}
              disabled={loading}
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
            >
              ยังไม่สิ้นสุด
            </button>
          </div>
        </Modal>
      )}

      {editTimeOpen && session && (
        <Modal ariaLabel="แก้ไขเวลา" onClose={() => setEditTimeOpen(false)}>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              {mode === "fasting" ? "แก้ไขเวลาอดอาหาร" : "แก้ไขเวลากิน"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {mode === "fasting"
                ? "ใช้สำหรับกรณีที่ลืมกดเริ่มอดอาหาร"
                : "ใช้สำหรับกรณีที่ลืมกดกินอาหาร"}
            </p>
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-center">
            <input
              type="time"
              value={editTimeValue}
              onChange={(e) => setEditTimeValue(e.target.value)}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-2xl font-bold tracking-wider text-center outline-none focus:border-[#18A659] focus:ring-1 focus:ring-[#18A659]"
            />
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={saveEditedTime}
              disabled={loading}
              className="rounded-full bg-[#18A659] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : "บันทึกเวลา"}
            </button>
            <button
              type="button"
              onClick={() => setEditTimeOpen(false)}
              disabled={loading}
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
            >
              ยกเลิก
            </button>
          </div>
        </Modal>
      )}

      {confirmCancel && session && (
        <Modal ariaLabel="ยืนยันยกเลิกเซสชัน" onClose={closeConfirmCancel}>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              ยกเลิกเซสชันนี้?
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              เซสชันจะถูกลบและไม่ถูกบันทึกลงประวัติการทำ IF
            </p>
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={cancelSession}
              disabled={loading}
              className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
            </button>
            <button
              type="button"
              onClick={closeConfirmCancel}
              disabled={loading}
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
            >
              ยังไม่ยกเลิก
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
