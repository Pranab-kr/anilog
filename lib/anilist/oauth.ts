import "server-only";

/**
 * AniList OAuth2 (Authorization Code Grant) helpers.
 *
 * Flow:
 *   1. Redirect user → https://anilist.co/api/v2/oauth/authorize?client_id=...&response_type=code
 *   2. AniList redirects back to {redirectUri}?code=...
 *   3. Server exchanges `code` for an `access_token` (JWT, long-lived — AniList
 *      does NOT issue refresh tokens).
 *
 * Because AniList returns only an access token (no user profile / email), it is
 * a *linked account*, not a login provider. We fetch the user's identity via
 * the `Viewer` GraphQL query after obtaining the token.
 *
 * Env vars:
 *   ANILIST_CLIENT_ID
 *   ANILIST_CLIENT_SECRET
 *   (optional) ANILIST_REDIRECT_URI — defaults to ${APP_URL}/api/anilist/callback
 */

const AUTHORIZE_URL = "https://anilist.co/api/v2/oauth/authorize";
const TOKEN_URL = "https://anilist.co/api/v2/oauth/token";

export function getAnilistRedirectUri(): string {
  if (process.env.ANILIST_REDIRECT_URI) return process.env.ANILIST_REDIRECT_URI;
  const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  return `${appUrl.replace(/\/$/, "")}/api/anilist/callback`;
}

/** True when the app has AniList credentials configured. */
export function isAnilistConfigured(): boolean {
  return Boolean(
    process.env.ANILIST_CLIENT_ID && process.env.ANILIST_CLIENT_SECRET,
  );
}

/** Build the URL the user visits to authorize the app on AniList. */
export function buildAuthorizationUrl(): string {
  const clientId = process.env.ANILIST_CLIENT_ID;
  if (!clientId) throw new Error("ANILIST_CLIENT_ID is not set");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getAnilistRedirectUri(),
    response_type: "code",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/** Exchange an authorization code for an access token. */
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  tokenType: string;
  expiresAt: number | null; // AniList tokens don't expire, but keep the field
}> {
  const clientId = process.env.ANILIST_CLIENT_ID;
  const clientSecret = process.env.ANILIST_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("AniList client credentials are not configured");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getAnilistRedirectUri(),
      code,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Failed to exchange AniList code for token (status ${res.status}): ${detail}`,
    );
  }

  const body = (await res.json()) as {
    access_token: string;
    token_type?: string;
    expires_in?: number;
  };

  return {
    accessToken: body.access_token,
    tokenType: body.token_type ?? "bearer",
    expiresAt: body.expires_in
      ? Date.now() + body.expires_in * 1000
      : null,
  };
}
