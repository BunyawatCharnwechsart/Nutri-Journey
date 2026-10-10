/**
 * สร้างแถบ roll สไตล์ CSGO — pure function เทสต์ได้โดยไม่ต้องต่อ DB.
 *
 * กติกา:
 * - ช่องที่ชนะ (`wonType`) อยู่ตายตัวที่ WIN_INDEX (แถบวิ่งแล้วหยุดตรงนี้).
 * - ช่องอื่นสุ่มจาก catalog (ใช้น้ำหนักจริงผ่าน random ภายนอก? ไม่ —
 *   filler สุ่ม uniform เพื่อความหลากหลายทางภาพ ผลจริงตายตัวอยู่แล้ว).
 * - `jitter` ขยับจุดหยุด ±30% ของความกว้างช่อง — เข็มยังอยู่ในช่องที่ชนะ
 *   เสมอ (เปลี่ยนผลไม่ได้ แค่กันจำจุดหยุด).
 */

export const SPIN_STRIP_SIZE = 60;
/** ช่องที่ชนะ (นับจาก 0) — ท้ายๆ แถบให้วิ่งนานพอลุ้น. */
export const SPIN_WIN_INDEX = 50;
/** jitter สูงสุดเป็นสัดส่วนของความกว้าง 1 ช่อง (0.3 = ±30%). */
export const SPIN_JITTER_RATIO = 0.3;

export interface SpinCell {
  /** ชนิดไข่ที่โชว์ในช่องนี้. */
  eggType: string;
  /** level รูปที่โชว์ (สุ่มครั้งเดียวตอนสร้างแถบ — แค่ภาพประกอบ). */
  level: number;
  /** true เฉพาะช่องที่ชนะ (ใต้เข็มตอนหยุด). */
  isWinner: boolean;
}

export interface SpinStrip {
  cells: SpinCell[];
  /** index ของช่องที่ชนะ (= SPIN_WIN_INDEX เสมอ). */
  winIndex: number;
  /** ส่วนเบี่ยงจุดหยุดเป็นสัดส่วนของความกว้างช่อง (-0.3..0.3). */
  jitter: number;
}

export function buildSpinStrip(
  wonType: string,
  catalog: string[],
  random: () => number = Math.random
): SpinStrip {
  const pool = catalog.length > 0 ? catalog : [wonType];
  const cells: SpinCell[] = [];
  for (let i = 0; i < SPIN_STRIP_SIZE; i++) {
    if (i === SPIN_WIN_INDEX) {
      cells.push({ eggType: wonType, level: 0, isWinner: true });
    } else {
      // filler โชว์แค่ไข่ level 0 ทุกช่อง (ต่างกันแค่ชนิด) — ตรงกับของจริง
      // ที่สุ่มได้ (exp 0) และไม่สปอยล์ร่างโตก่อนเฉลย.
      const pick = pool[Math.floor(random() * pool.length)] ?? wonType;
      cells.push({ eggType: pick, level: 0, isWinner: false });
    }
  }
  const jitter = (random() * 2 - 1) * SPIN_JITTER_RATIO;
  return { cells, winIndex: SPIN_WIN_INDEX, jitter };
}

/**
 * ระยะเลื่อน (px) ให้ช่อง winIndex อยู่ใต้เข็มกลาง:
 * จุดกึ่งกลางช่อง - ครึ่งความกว้างจอ + jitter.
 */
export function spinOffsetPx(
  winIndex: number,
  cellWidth: number,
  viewportWidth: number,
  jitter: number
): number {
  return winIndex * cellWidth + cellWidth / 2 - viewportWidth / 2 + jitter * cellWidth;
}
