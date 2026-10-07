/**
 * คณิต "อดติดกันกี่วัน" สำหรับระบบสุ่มไข่ — pure function เทสต์ได้โดยไม่ต่อ DB.
 *
 * กติกา:
 * - นับวันปฏิทิน ICT (date-key "yyyy-MM-dd") ที่มี success อย่างน้อย 1 ครั้ง —
 *   ตรงกับสีใน Calendar (lib/calendar.ts นับแบบเดียวกัน).
 * - วันซ้ำนับครั้งเดียว, ขาดวันเดียว streak ขาด (เริ่มนับใหม่).
 * - streak มีชีวิตเฉพาะเมื่อวัน success ล่าสุดคือ "วันนี้" หรือ "เมื่อวาน"
 *   (เมื่อวาน = ยังมีลุ้นต่อวันนี้, เก่ากว่านั้นถือว่าหลุดแล้ว progress = 0).
 * - หน้าต่างที่แจกสิทธิ์ = 3 วันแรกของ run ปัจจุบัน (หลัง anchor ครั้งก่อน).
 */
export const EGG_DRAW_STREAK_DAYS = 3;

export interface DrawProgress {
  /** จำนวนวันติดใน run ปัจจุบัน (0 ถ้าหลุดแล้ว). */
  streakDays: number;
  /** ความคืบหน้า 0–3 เอาไปวาด progress. */
  progress: number;
  /** true เมื่อครบ 3 วัน (แจกสิทธิ์ได้). */
  eligible: boolean;
  /** วันแรก/วันสุดท้ายของหน้าต่าง 3 วันที่จะแจก (null ถ้ายังไม่ครบ). */
  cycleStart: string | null;
  cycleEnd: string | null;
}

function parseKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function toKey(ms: number): string {
  const t = new Date(ms);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function currentProgress(
  successKeys: string[],
  lastCycleEnd: string | null,
  todayKey: string
): DrawProgress {
  const empty: DrawProgress = {
    streakDays: 0,
    progress: 0,
    eligible: false,
    cycleStart: null,
    cycleEnd: null,
  };

  // ตัดวันซ้ำ + วันที่อยู่หลัง anchor ครั้งก่อน + วันอนาคต (กัน clock skew).
  const days = [...new Set(successKeys)]
    .filter((k) => (lastCycleEnd == null || k > lastCycleEnd) && k <= todayKey)
    .sort();
  if (days.length === 0) {
    return empty;
  }

  // run ต่อเนื่องที่ลงท้ายวันล่าสุด.
  const run: string[] = [days[days.length - 1] as string];
  for (let i = days.length - 2; i >= 0; i--) {
    const prev = days[i] as string;
    const last = run[0] as string;
    if (parseKey(last) - parseKey(prev) === DAY_MS) {
      run.unshift(prev);
    } else {
      break;
    }
  }

  // streak มีชีวิตเฉพาะวันล่าสุดคือวันนี้หรือเมื่อวาน.
  const latestMs = parseKey(run[run.length - 1] as string);
  const gapDays = Math.round((parseKey(todayKey) - latestMs) / DAY_MS);
  if (gapDays > 1) {
    return empty;
  }

  const streakDays = run.length;
  const eligible = streakDays >= EGG_DRAW_STREAK_DAYS;
  return {
    streakDays,
    progress: Math.min(streakDays, EGG_DRAW_STREAK_DAYS),
    eligible,
    cycleStart: eligible ? (run[0] as string) : null,
    cycleEnd: eligible
      ? toKey(parseKey(run[0] as string) + (EGG_DRAW_STREAK_DAYS - 1) * DAY_MS)
      : null,
  };
}
