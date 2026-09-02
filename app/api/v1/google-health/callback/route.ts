import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/service";
import {
  SCOPES,
  exchangeCodeForTokens,
  getGoogleIdentity,
} from "@/lib/google-health";

export const runtime = "nodejs";

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/dashboard?google_error=missing_params", request.url)
    );
  }

  try {
    const cookieStore = await cookies();
    const nonce = cookieStore.get("gh_state")?.value;

    if (!nonce) {
      return NextResponse.redirect(
        new URL("/dashboard?google_error=invalid_state", request.url)
      );
    }

    const { payload } = await jwtVerify(state, getSessionSecret());

    if (typeof payload.userId !== "string" || payload.nonce !== nonce) {
      return NextResponse.redirect(
        new URL("/dashboard?google_error=state_mismatch", request.url)
      );
    }

    const userId = payload.userId;

    cookieStore.delete("gh_state");

    const tokens = await exchangeCodeForTokens(code);

    const grantedScopes = tokens.scope.split(" ");

    if (!grantedScopes.includes(SCOPES)) {
      return NextResponse.redirect(
        new URL(
          `/dashboard?google_error=scope_not_granted&google_granted=${encodeURIComponent(
            grantedScopes.join(",")
          )}`,
          request.url
        )
      );
    }

    const identity = await getGoogleIdentity(tokens.access_token);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const supabase = createServiceClient();

    await supabase.from("google_health_connections").upsert(
      {
        user_id: userId,
        google_sub: identity.healthUserId ?? identity.name ?? null,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: expiresAt.toISOString(),
        granted_scopes: grantedScopes,
        connected_at: new Date().toISOString(),
        last_synced_at: null,
        revoked_at: null,
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(
      new URL("/dashboard?google_connected=true", request.url)
    );
  } catch (error) {
    console.error("[Google Health Callback]", error);
    return NextResponse.redirect(
      new URL("/dashboard?google_error=exchange_failed", request.url)
    );
  }
}
