"use client";

import Modal from "@/components/Modal";

interface ConfirmCancelModalProps {
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}

/** Confirms cancelling (deleting) the running IF session. */
export default function ConfirmCancelModal({
  onConfirm,
  onClose,
  loading,
  error,
}: ConfirmCancelModalProps) {
  return (
    <Modal ariaLabel="ยืนยันยกเลิกเซสชัน" onClose={onClose}>
      <div>
        <h2 className="text-lg font-bold text-zinc-900">ยกเลิกเซสชันนี้?</h2>
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
          onClick={onConfirm}
          disabled={loading}
          className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
        >
          ยังไม่ยกเลิก
        </button>
      </div>
    </Modal>
  );
}