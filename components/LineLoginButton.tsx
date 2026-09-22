"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Liff } from "@line/liff";

type Status = "initializing" | "ready" | "logging-in" | "error";

export default function LineLoginButton({
  autoLogin = true,
  subtitle,
}: {
  /** Auto-login when already logged in to LINE (true on the home page). */
  autoLogin?: boolean;
  /** Optional caption shown below the button (e.g. "ฟรี ไม่มีค่าใช้จ่าย"). */
  subtitle?: string;
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
        className="flex h-12 w-full max-w-xs items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#16A34A] to-[#22C55E] px-5 text-base font-semibold text-white shadow-[0_18px_40px_rgba(34,197,94,0.25)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "initializing" || status === "logging-in" ? (
          "กำลังเชื่อมต่อ LINE..."
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0 fill-current"
              aria-hidden="true"
            >
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            ลงทะเบียนด้วยไลน์
          </>
        )}
      </button>
      {subtitle && <p className="mt-2 text-sm text-[#9CA3AF]">{subtitle}</p>}
      {status === "error" && error && (
        <p className="max-w-xs text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}