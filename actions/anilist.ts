"use server";

import { db } from "@/lib/db";
import { anilistAccount } from "@/schema/media-schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { getViewer, searchMedia as _searchMedia } from "@/lib/anilist/client";
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  isAnilistConfigured,
} from "@/lib/anilist/oauth";
import type { AniListViewer, AniListSearchResult } from "@/lib/anilist/types";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

export interface AniListConnection {
  connected: boolean;
  username: string | null;
  anilistUserId: number | null;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

/** Get the AniList account row for the current app user (or null). */
async function getAnilistAccountRow() {
  const user = await getCurrentUser();
  const [row] = await db
    .select()
    .from(anilistAccount)
    .where(eq(anilistAccount.userId, user.id));
  return row;
}

/* ------------------------------------------------------------------
   Actions
   ------------------------------------------------------------------ */

/** Check whether AniList credentials are configured in env. */
export async function checkAniListConfigured(): Promise<boolean> {
  return isAnilistConfigured();
}

/** Get the current user's AniList connection status. */
export async function getAniListConnection(): Promise<{
  success: boolean;
  data?: AniListConnection;
  error?: string;
}> {
  try {
    const row = await getAnilistAccountRow();
    return {
      success: true,
      data: row
        ? {
            connected: true,
            username: row.anilistUsername,
            anilistUserId: row.anilistUserId,
          }
        : { connected: false, username: null, anilistUserId: null },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get AniList connection",
    };
  }
}

/**
 * Build the AniList OAuth authorization URL for the current user.
 * The caller (client) should `window.location.href = url` to redirect.
 */
export async function getAniListAuthUrl(): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    if (!isAnilistConfigured()) {
      return { success: false, error: "AniList is not configured" };
    }
    return { success: true, url: buildAuthorizationUrl() };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to build auth URL",
    };
  }
}

/**
 * Handle the OAuth callback.
 *
 * Called by `app/api/anilist/callback/route.ts` after receiving the code.
 * Exchanges the code for a token, fetches the AniList viewer identity, and
 * upserts the `anilist_account` row.
 *
 * Returns the viewer info so the route can display it in the redirect flash.
 */
export async function handleAniListCallback(code: string): Promise<{
  success: boolean;
  viewer?: AniListViewer;
  error?: string;
}> {
  try {
    // 1. Exchange code → access token
    const { accessToken } = await exchangeCodeForToken(code);

    // 2. Fetch the AniList user identity
    const viewer = await getViewer(accessToken);

    // 3. Upsert into our anilist_account table
    const user = await getCurrentUser();

    const [existing] = await db
      .select()
      .from(anilistAccount)
      .where(eq(anilistAccount.userId, user.id));

    if (existing) {
      await db
        .update(anilistAccount)
        .set({
          anilistUserId: viewer.id,
          anilistUsername: viewer.name,
          accessToken,
          updatedAt: new Date(),
        })
        .where(eq(anilistAccount.id, existing.id));
    } else {
      await db.insert(anilistAccount).values({
        userId: user.id,
        anilistUserId: viewer.id,
        anilistUsername: viewer.name,
        accessToken,
      });
    }

    return { success: true, viewer };
  } catch (error) {
    console.error("AniList callback error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to connect AniList",
    };
  }
}

/** Disconnect the current user's AniList account. */
export async function disconnectAniList(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const row = await getAnilistAccountRow();
    if (!row) {
      return { success: true }; // nothing to disconnect
    }

    await db
      .delete(anilistAccount)
      .where(
        and(
          eq(anilistAccount.userId, (await getCurrentUser()).id),
          eq(anilistAccount.id, row.id),
        ),
      );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to disconnect AniList",
    };
  }
}

/**
 * Internal helper: get the stored AniList access token for the current user.
 * Used by write-through sync — not exported to client.
 */
export async function _getAniListAccessToken(): Promise<string | null> {
  const row = await getAnilistAccountRow();
  return row?.accessToken ?? null;
}

/**
 * Search AniList media by title. Callable from client components.
 * Public AniList read — no token required.
 */
export async function searchAniList(
  term: string,
  type: "ANIME" | "MANGA",
): Promise<{ success: boolean; data?: AniListSearchResult[]; error?: string }> {
  try {
    const data = await _searchMedia(term, type, 6);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "AniList search failed",
    };
  }
}
