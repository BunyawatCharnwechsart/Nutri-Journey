"use client";

import { useCallback, useEffect, useState } from "react";

import { type CalendarSessionInput } from "@/lib/calendar";
import { toICTMonthKey } from "@/lib/timezone";
import IfCalendar from "@/components/IfCalendar";
import IfSuccessCard from "@/components/IfSuccessCard";

interface CalendarTabProps {
  initialMonthKey: string;
  todayKey: string;
}

/**
 * แท็บปฏิทิน: ถือ state ของเดือน + fetch sessions ไว้ตรงกลาง เพื่อให้
 * IfCalendar (กริด) และ IfSuccessCard (ความสำเร็จ) ใช้ข้อมูลชุดเดียวกัน
 * และวาง "ความสำเร็จ" เป็น card แยกใต้ card ปฏิทินได้.
 */
export default function CalendarTab({
  initialMonthKey,
  todayKey,
}: CalendarTabProps) {
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [sessions, setSessions] = useState<CalendarSessionInput[]>([]);
  const [loading, setLoading] = useState(true);

  const [year, month] = monthKey.split("-").map(Number);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSessions() {
      try {
        const res = await fetch(`/api/v1/if-sessions?month=${monthKey}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.sessions)) {
          setSessions(json.data.sessions);
        } else {
          setSessions([]);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSessions([]);
        }
      }
      setLoading(false);
    }

    loadSessions();
    return () => controller.abort();
  }, [monthKey]);

  const goMonth = useCallback(
    (delta: number) => {
      setLoading(true);
      const d = new Date(Date.UTC(year, month - 1 + delta, 1));
      setMonthKey(toICTMonthKey(d));
    },
    [year, month]
  );

  return (
    <div className="flex flex-col gap-4">
      <IfCalendar
        monthKey={monthKey}
        todayKey={todayKey}
        sessions={sessions}
        loading={loading}
        onMonthChange={goMonth}
      />
      <IfSuccessCard monthKey={monthKey} sessions={sessions} loading={loading} />
    </div>
  );
}