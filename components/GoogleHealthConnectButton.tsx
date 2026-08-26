"use client";

import { useState } from "react";

interface Props {
  isConnected: boolean;
  onConnected?: () => void;
}

const GOOGLE_GRADIENT = {
  background: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)",
} as const;

export default function GoogleHealthConnectButton({
  isConnected,
  onConnected,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/google-health/auth-url", {
        method: "GET",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { url?: string };
        error?: { message?: string };
      };

      if (!res.ok || !json.success || !json.data?.url) {
        setError(json.error?.message ?? "ไม่สามารถสร้างลิงก์เชื่อมต่อได้");
        setLoading(false);
        return;
      }

      window.open(json.data.url, "_blank");
      onConnected?.();
    } catch {
      setError("เกิดข้อผิดพลาด ลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  if (isConnected) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        style={GOOGLE_GRADIENT}
        className="w-full rounded-xl px-6 py-3 text-[16px] font-bold text-white transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            กำลังเชื่อมต่อ...
          </span>
        ) : (
          "เชื่อมต่อ Google Health"
        )}
      </button>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <p className="text-center text-xs text-zinc-400">
        เชื่อมต่อเพื่อดึงข้อมูลกิจกรรม น้ำหนัก การนอน และอัตราการเต้นหัวใจจาก Google Health
      </p>
    </div>
  );
}
