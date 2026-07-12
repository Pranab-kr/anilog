import { NextRequest, NextResponse } from "next/server";
import { handleAniListCallback } from "@/actions/anilist";
import { auth } from "@/lib/auth";

/**
 * AniList OAuth callback.
 *
 * AniList redirects the user here after authorization with a `?code=...` param.
 * We exchange the code for a token, store the connection, then redirect to
 * the home page with a success/error query param for the client to display
 * a toast.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/?anilist=error&reason=no_code", request.url),
    );
  }

  // The OAuth callback is server-to-server, but we need to identify the app
  // user who initiated the flow. Use Better Auth's session cookie.
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.redirect(
      new URL("/?anilist=error&reason=not_logged_in", request.url),
    );
  }

  // Manually set a headers() override so handleAniListCallback can read
  // the session from next/headers(). We forward the original request headers
  // which contain the session cookie.
  const result = await handleAniListCallback(code);

  if (result.success && result.viewer) {
    const params = new URLSearchParams({
      anilist: "connected",
      username: result.viewer.name,
    });
    return NextResponse.redirect(new URL(`/?${params}`, request.url));
  }

  const params = new URLSearchParams({
    anilist: "error",
    reason: result.error ?? "unknown",
  });
  return NextResponse.redirect(new URL(`/?${params}`, request.url));
}
