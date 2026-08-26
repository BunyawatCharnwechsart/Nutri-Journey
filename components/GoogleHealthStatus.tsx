"use client";

import { useState } from "react";

interface Props {
  connectedAt: string | null;
  lastSyncedAt: string | null;
  onDisconnected?: () => void;
  onSync?: () => void;
}

export default function GoogleHealthStatus({
  connectedAt,
  lastSyncedAt,
  onDisconnected,
  onSync,
}: Props) {
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function formatDateTime(value: string): string {
    const d = new Date(value);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes} น.`;
  }

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setSuccess(null);

    try {
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = today.toISOString().slice(0, 10);

      const res = await fetch("/api/v1/google-health/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromStr, to: toStr }),
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { synced?: number };
        error?: { message?: string };
      };

      if (!res.ok || !json.success) {
        setError(json.error?.message ?? "ซิงค์ไม่สำเร็จ ลองอีกครั้ง");
        return;
      }

      setSuccess(`ซิงค์สำเร็จ ${json.data?.synced ?? 0} วัน`);
      onSync?.();
    } catch {
      setError("เกิดข้อผิดพลาด ลองอีกครั้ง");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("ต้องการยกเลิกการเชื่อมต่อ Google Health จริงหรือไม่?")) {
      return;
    }

    setDisconnecting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/google-health/disconnect", {
        method: "POST",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };

      if (!res.ok || !json.success) {
        setError(json.error?.message ?? "ยกเลิกไม่สำเร็จ ลองอีกครั้ง");
        return;
      }

      onDisconnected?.();
    } catch {
      setError("เกิดข้อผิดพลาด ลองอีกครั้ง");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[#18A659]" />
        <span className="text-sm font-medium text-[#148D4C]">
          เชื่อมต่อแล้ว
        </span>
      </div>

      {connectedAt && (
        <p className="px-1 text-xs text-zinc-400">
          เชื่อมต่อเมื่อ {formatDateTime(connectedAt)}
        </p>
      )}

      {lastSyncedAt && (
        <p className="px-1 text-xs text-zinc-400">
          ซิงค์ล่าสุด {formatDateTime(lastSyncedAt)}
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">
          {success}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing || disconnecting}
          className="w-full rounded-xl bg-[#18A659] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:opacity-50"
        >
          {syncing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              กำลังซิงค์ข้อมูล 7 วันล่าสุด...
            </span>
          ) : (
            "ซิงค์ข้อมูล"
          )}
        </button>

        <button
          type="button"
          onClick={handleDisconnect}
          disabled={syncing || disconnecting}
          className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50"
        >
          {disconnecting ? "กำลังยกเลิก..." : "ยกเลิกการเชื่อมต่อ"}
        </button>
      </div>
    </div>
  );
}
