import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const WINDOW_MS = 60 * 1000; // 1 นาที

const GENERAL_LIMIT = 60; // 60 req/min/IP สำหรับ API ทั่วไป
const LOGIN_LIMIT = 10; // 10 req/min/IP สำหรับ /api/v1/auth/login

const LOGIN_PATH = "/api/v1/auth/login";

// bucket ที่ใช้ล้างทุกครั้งที่ถึง window ใหม่
const buckets = new Map<string, { count: number; resetAt: number }>();

let checkCount = 0;

function getClientIp(request: NextRequest): string {
  // Vercel/Proxy ต่อกันเป็น chain ค่าแรกคือ client จริง
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

// ล้าง bucket ที่หมดอายุแล้ว เพื่อไม่ให้ memory โตไม่มีที่สิ้นสุด
function cleanupExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}

function checkLimit(
  ip: string,
  kind: "general" | "login"
): { allowed: boolean; resetAt: number; limit: number } {
  const limit = kind === "login" ? LOGIN_LIMIT : GENERAL_LIMIT;
  const key = `${kind}:${ip}`;
  const now = Date.now();

  const bucket = buckets.get(key);

  // ยังไม่มี record หรือ window เก่าหมดอายุ -> เริ่มนับใหม่
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, resetAt: now + WINDOW_MS, limit };
  }

  if (bucket.count >= limit) {
    return { allowed: false, resetAt: bucket.resetAt, limit };
  }

  bucket.count += 1;
  return { allowed: true, resetAt: bucket.resetAt, limit };
}

export async function proxy(request: NextRequest) {
  // rate limit เฉพาะ API เท่านั้น (หน้าเว็บ/static ไม่นับ)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip = getClientIp(request);
    const kind = request.nextUrl.pathname === LOGIN_PATH ? "login" : "general";

    const { allowed, resetAt } = checkLimit(ip, kind);

    // ล้าง bucket เก่าเป็นระยะ (ทุก ~100 request) ไม่ต้องทำทุกครั้ง
    checkCount += 1;
    if (checkCount % 100 === 0) {
      cleanupExpired(Date.now());
    }

    if (!allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((resetAt - Date.now()) / 1000)
      );

      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        }
      );
    }
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};