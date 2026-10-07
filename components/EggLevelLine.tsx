import {
  expForNextLevel,
  expInLevel,
  levelFromPoints,
} from "@/lib/healthy-journey";

/**
 * บรรทัดเลเวลไข่ฟอร์แมตเดียวทั้งแอป: "เลเวล L · A / B exp".
 * ใช้ทั้งใต้รูป Avatar (my-egg) และตู้สะสม (egg-draw) กันสองที่เพี้ยนกัน.
 */
export default function EggLevelLine({ exp }: { exp: number }) {
  const level = levelFromPoints(exp);
  const needNext = expForNextLevel(level);
  return (
    <span>
      เลเวล {level} · {expInLevel(exp)} / {needNext ?? "MAX"} exp
    </span>
  );
}
