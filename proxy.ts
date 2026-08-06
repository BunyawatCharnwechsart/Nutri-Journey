import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // Placeholder for edge middleware. Add rate limiting for /api/:path*
  // here later (see SDS.md 13.1): 60 req/min per IP globally,
  // 10 req/min for /api/v1/auth/login.
  void request;

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
