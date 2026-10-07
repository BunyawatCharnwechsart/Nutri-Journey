"use client";

import { useRouter } from "next/navigation";

interface BackButtonProps {
  /** ไปหน้านี้แทนถ้าไม่มี history ให้ถอย (เช่น เปิดจาก LINE ตรงๆ). */
  fallback?: string;
  /** ข้อความหลังลูกศร — default "กลับ". */
  label?: string;
}

/**
 * ปุ่มลูกศรย้อนกลับสำหรับหน้าย่อย (เช่น /ranking, /egg-draw).
 *
 * กดแล้วถอย history ก่อน — แต่ใน LINE LIFF เปิดลิงก์ตรงอาจไม่มี history
 * เลยต้องมี fallback (default /dashboard) กันกดแล้วนิ่ง.
 */
export default function BackButton({
  fallback = "/dashboard",
  label = "กลับ",
}: BackButtonProps) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.replace(fallback);
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className="flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-full px-2 text-base font-semibold text-zinc-700 transition-colors active:bg-zinc-100"
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        ‹
      </span>
      <span>{label}</span>
    </button>
  );
}
