"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Liff } from "@line/liff";

type Status = "initializing" | "ready" | "logging-in" | "error";

export default function LineLoginButton({
  autoLogin = true,
}: {
  /** Auto-login when already logged in to LINE (true on the home page). */
  autoLogin?: boolean;
}) {
  const router = useRouter();
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const [status, setStatus] = useState<Status>(
    liffId ? "initializing" : "error"
  );
  const [error, setError] = useState<string | null>(
    liffId ? null : "NEXT_PUBLIC_LIFF_ID is not configured"
  );

  // The LIFF SDK is only fetched when actually needed (init or login click)
  // instead of being bundled eagerly, so the landing page parses less JS.
  // The module instance is cached here to keep the rest of the code unchanged.
  const liffRef = useRef<Liff | null>(null);

  const getLiff = useCallback(async (): Promise<Liff> => {
    if (!liffRef.current) {
      const liffModule = await import("@line/liff");
      liffRef.current = liffModule.default;
    }
    return liffRef.current;
  }, []);

  const login = useCallback(async () => {
    const liff = await getLiff();

    if (!liff.isLoggedIn()) {
      // Only reached when the app runs outside the LINE app (e.g. the
      // LIFF emulator in a regular browser). Redirects the user through
      // LINE's login page, then the app reloads and auto-login continues.
      liff.login({
        redirectUri: window.location.origin + window.location.pathname,
      });
      return;
    }

    setStatus("logging-in");
    setError(null);

    try {
      const idToken = liff.getIDToken();
      if (!idToken) {
        throw new Error("LINE did not return an idToken");
      }

      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const json = (await res.json().catch(() => null)) as {
        error?: { message?: string };
        data?: { profileComplete?: boolean };
      } | null;

      if (!res.ok) {
        throw new Error(json?.error?.message ?? "Login failed");
      }

      // First-time users are sent to the health profile setup page.
      const profileComplete = json?.data?.profileComplete ?? false;
      router.push(profileComplete ? "/dashboard" : "/health-profile");
      router.refresh();
    } catch (e) {
      setStatus("ready");
      setError(e instanceof Error ? e.message : "Login failed");
    }
  }, [getLiff, router]);

  useEffect(() => {
    if (!liffId) return;
    const configuredLiffId: string = liffId;

    let cancelled = false;

    async function initLiff() {
      try {
        const liff = await getLiff();
        await liff.init({ liffId: configuredLiffId });
        if (cancelled) return;
        if (liff.isLoggedIn() && autoLogin) {
          login();
        } else {
          setStatus("ready");
        }
      } catch (error: unknown) {
        if (cancelled) return;
        // DEBUG: surface the real LIFF error so we can tell apart an
        // invalid LIFF ID, a mismatched endpoint, or a cancelled permission.
        const err = error as { code?: string; message?: string };
        console.error("[LIFF] liff.init failed", err);
        setStatus("error");
        setError(
          `LIFF init error${err?.code ? ` [${err.code}]` : ""}: ${
            err?.message ?? "unknown"
          }`
        );
      }
    }

    initLiff();

    return () => {
      cancelled = true;
    };
  }, [getLiff, liffId, autoLogin, login]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <button
        type="button"
        onClick={login}
        disabled={status === "initializing" || status === "logging-in"}
        className="flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-[#18A659] px-5 text-base font-semibold text-white transition-colors hover:bg-[#148D4C] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "initializing" || status === "logging-in"
          ? "กำลังเชื่อมต่อ LINE..."
          : "เข้าสู่ระบบด้วย LINE"}
      </button>
      {status === "error" && error && (
        <p className="max-w-xs text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}