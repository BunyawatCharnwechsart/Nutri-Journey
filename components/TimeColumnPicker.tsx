"use client";

import { useEffect, useRef } from "react";

/**
 * ค่าคงที่ pixel — ต้องตรงกับ style ของ item (h-10 = 40px) และ container
 * (h-[200px]) ห้ามเปลี่ยนข้างใดข้างหนึ่งเดียวมิฉะนั้น index คำนวณเพี้ยน.
 */
const ITEM_HEIGHT = 40;
const COLLECTION_HEIGHT = 200; // มองเห็นได้พร้อมกัน 5 ช่อง
const SPACER = (COLLECTION_HEIGHT - ITEM_HEIGHT) / 2;

interface TimeColumnPickerProps {
  /** ใช้เป็น aria-label ให้ screen reader เช่น "ชั่วโมง" / "นาที". */
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  /** แปลงตัวเลขเป็นข้อความแสดง เช่น pad2 → "07". */
  format: (value: number) => string;
}

/**
 * Column picker แทน native <select> — ตัวเลือกเป็น HTML ล้วน เลื่อนได้
 * ไม่มี popup ให้ปิด (native select บน iOS/LINE จะปิดเองทันทีเมื่อ parent
 * re-render เช่น ทุก 1 วินาที ticker ของหน้า timer).
 *
 * Infinite loop: แสดงตัวเลขซ้ำ 3 ชุด (ชุดกลาง = เลือกจริง) แล้วคำนวณค่า
 * ด้วย modulo จาก scrollTop — เลื่อนขึ้น/ลงได้เรื่อย ๆ ไม่มีจุดจบ.
 *
 * Scroll position = (index) * ITEM_HEIGHT พอ item top ถึงกลาง viewport
 * (offsetTop ของ item = SPACER + index*ITEM_HEIGHT แล้วลบ centering offset
 * (COLLECTION_HEIGHT - ITEM_HEIGHT)/2 = SPACER เหลือ index*ITEM_HEIGHT).
 *
 * ระหว่างเลื่อนจะไม่แตะ scrollTop (กัน iOS ตัด momentum ทิ้งเมื่อ set
 * scrollTop กลางการลาก) พอหยุด 150ms ถึงค่อย "realign" กระโดดกลับชุดกลาง
 * ด้วย scrollTop ± 1 ชุด — เนื้อหาเหมือนกันทุกชุด เลยมองไม่เห็นกระโดด.
 */
export default function TimeColumnPicker({
  label,
  value,
  min,
  max,
  disabled = false,
  onChange,
  format,
}: TimeColumnPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const initRef = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = max - min + 1;
  /** ความยาว (px) ของตัวเลขครบ 1 ชุด ใช้กระโดดกลับชุดกลางตอน realign. */
  const cycle = count * ITEM_HEIGHT;

  // เลื่อนถึงเลขไหน → ส่งค่าใหม่ให้ parent + นัด realign หลังหยุดเลื่อน.
  function handleScroll() {
    const el = scrollRef.current;
    if (!el || disabled) return;
    const rawIndex = Math.round(el.scrollTop / ITEM_HEIGHT);
    const next = min + (((rawIndex % count) + count) % count);
    if (next !== value) {
      onChange(next);
    }
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
    }
    settleTimer.current = setTimeout(realign, 150);
  }

  // หลังหยุดเลื่อน → เลื่อนมาให้อยู่ใน "ชุดกลาง" เสมอ (loop ไม่สิ้นสุด).
  function realign() {
    const el = scrollRef.current;
    if (!el) return;
    const rawIndex = Math.round(el.scrollTop / ITEM_HEIGHT);
    if (rawIndex < count) {
      el.scrollTop += cycle;
    } else if (rawIndex >= 2 * count) {
      el.scrollTop -= cycle;
    }
  }

  // เคลียร์ timer ที่ค้างตอน unmount (บน dev StrictMode ด้วย).
  useEffect(
    () => () => {
      if (settleTimer.current) {
        clearTimeout(settleTimer.current);
      }
    },
    []
  );

  const options: number[] = [];
  for (let i = 0; i < count * 3; i += 1) {
    options.push(min + (((i % count) + count) % count));
  }

  return (
    <div
      role="listbox"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={`min-w-0 flex-1 ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      {/* ref callback รันก่อน paint → วางค่าปัจจุบันไว้กลางตั้งแต่เปิด ไม่กระพริบ. */}
      <div
        ref={(el) => {
          scrollRef.current = el;
          if (el && !initRef.current) {
            initRef.current = true;
            const clamped = Math.min(max, Math.max(min, value));
            el.scrollTop = cycle + (clamped - min) * ITEM_HEIGHT;
          }
        }}
        onScroll={handleScroll}
        className="relative h-[200px] overflow-y-auto overscroll-contain snap-y snap-mandatory"
      >
        <div className="block" style={{ height: SPACER }} />
        {options.map((v, i) => (
          <button
            key={i}
            type="button"
            role="option"
            aria-selected={v === value}
            onClick={() => {
              if (disabled) return;
              onChange(v);
              // เลื่อน item นี้มาอยู่กลางพอดี (scrollTop = index*ITEM_HEIGHT).
              scrollRef.current?.scrollTo({ top: i * ITEM_HEIGHT });
            }}
            className={`flex h-10 w-full snap-start items-center justify-center text-lg tabular-nums transition-colors ${
              v === value
                ? "font-bold text-[#18A659]"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {format(v)}
          </button>
        ))}
        <div className="block" style={{ height: SPACER }} />
        {/* เส้นไฮไลต์ตรงกลาง — แค่ตกแต่ง ไม่กีดขวางการแตะเลือก. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 rounded-lg border-y border-zinc-200 bg-zinc-50"
          style={{ top: SPACER + 1, height: ITEM_HEIGHT - 2 }}
        />
        {/* เงาจางบน/ล่าง ช่วยให้เห็นว่าเลื่อนได้. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent"
        />
      </div>
    </div>
  );
}