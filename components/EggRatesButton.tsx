"use client";

import { useState } from "react";

import { avatarForEgg } from "@/lib/healthy-journey";
import Modal from "@/components/Modal";
import type { DropRate } from "@/lib/egg-draw-service";

/**
 * ปุ่ม "เรทการสุ่ม" → popup บอกชนิดไข่ + โอกาสออก % (คำนวณฝั่ง server).
 * ถ้า catalog ว่าง (rates = []) ไม่เรนเดอร์ปุ่มเลย.
 */
export default function EggRatesButton({ rates }: { rates: DropRate[] }) {
  const [open, setOpen] = useState(false);

  if (rates.length === 0) {
    return null;
  }

  const equal = rates.every((r) => r.percent === rates[0]?.percent);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition-colors active:bg-zinc-50"
      >
        <span aria-hidden="true">%</span>
        เรทการสุ่ม
      </button>

      {open && (
        <Modal ariaLabel="เรทการสุ่มไข่" onClose={() => setOpen(false)}>
          <h3 className="text-lg font-bold text-zinc-900">เรทการสุ่ม</h3>
          <ul className="flex flex-col">
            {rates.map((rate) => (
              <li key={rate.code} className="flex items-center gap-3 py-2">
                <img
                  src={avatarForEgg(rate.code, 0)}
                  alt=""
                  width={40}
                  height={40}
                  loading="lazy"
                  className="h-10 w-10 shrink-0 object-contain"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
                  {rate.name}
                </span>
                <span className="w-14 shrink-0 text-right text-sm text-zinc-500">
                  {rate.percent.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
          <div
            role="progressbar"
            aria-label="สัดส่วนเรทรวม"
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-100"
          >
            {rates.map((rate) => (
              <div
                key={rate.code}
                className="h-full bg-[#6C4FD8] [&:not(:first-child)]:border-l [&:not(:first-child)]:border-white"
                style={{ width: `${rate.percent}%` }}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-400">
            {equal
              ? "โอกาสออกเท่ากันทุกชนิดในตอนนี้"
              : "โอกาสออกถ่วงตามความหายากของแต่ละชนิด"}
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-[48px] rounded-2xl bg-zinc-900 px-4 py-3 text-base font-semibold text-white active:bg-zinc-700"
          >
            ปิด
          </button>
        </Modal>
      )}
    </>
  );
}
