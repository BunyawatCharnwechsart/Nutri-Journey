"use client";

import { useEffect, useState } from "react";

import GoogleHealthConnectButton from "@/components/GoogleHealthConnectButton";
import GoogleHealthStatus from "@/components/GoogleHealthStatus";
import GoogleHealthDailySummary from "@/components/GoogleHealthDailySummary";

interface HealthStatus {
  connected: boolean;
  connectedAt: string | null;
  lastSyncedAt: string | null;
}

export default function GoogleHealthSection() {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/google-health/status", {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          success?: boolean;
          data?: HealthStatus;
        };
        if (!cancelled && res.ok && json.success && json.data) {
          setStatus(json.data);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-base font-semibold text-zinc-900">
          Google Health
        </h2>
        <div className="flex items-center justify-center py-6">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-[#18A659]" />
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-900">Google Health</h2>

      {status?.connected ? (
        <GoogleHealthStatus
          connectedAt={status.connectedAt}
          lastSyncedAt={status.lastSyncedAt}
          onDisconnected={() => setRefreshKey((k) => k + 1)}
          onSync={() => setRefreshKey((k) => k + 1)}
        />
      ) : (
        <GoogleHealthConnectButton
          isConnected={false}
          onConnected={() => setRefreshKey((k) => k + 1)}
        />
      )}

      {status?.connected && <GoogleHealthDailySummary refreshKey={refreshKey} />}
    </section>
  );
}
