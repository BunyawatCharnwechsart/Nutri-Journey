import { cookies } from "next/headers";
import { SignJWT } from "jose";

import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { getGoogleAuthUrl } from "@/lib/google-health";

export const runtime = "nodejs";

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) {
    return auth.response;
  }

  try {
    const nonce = crypto.randomUUID();

    const state = await new SignJWT({ userId: auth.userId, nonce })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(getSessionSecret());

    const cookieStore = await cookies();
    cookieStore.set("gh_state", nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });

    const url = getGoogleAuthUrl(state);

    return apiSuccess({ url });
  } catch {
    return apiError("ไม่สามารถสร้าง Google Auth URL ได้", 500, "INTERNAL_ERROR");
  }
}
