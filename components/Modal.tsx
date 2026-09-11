"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  ariaLabel: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Bottom-sheet-style dialog shared by every IF tracker modal: closes on
 * Escape or backdrop click and focuses the panel so keyboard users land
 * inside it.
 */
export default function Modal({ ariaLabel, onClose, children }: ModalProps) {
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