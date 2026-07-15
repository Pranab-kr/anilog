"use server";

import { searchMedia } from "@/lib/anilist/client";
import type { AniListMediaType, AniListSearchResult } from "@/lib/anilist/types";

/**
 * Server action wrapper around the AniList searchMedia client.
 * Keeps `server-only` imports off the client bundle.
 */
export async function searchAniList(
  term: string,
  type: AniListMediaType,
  perPage = 10,
): Promise<{ success: boolean; data?: AniListSearchResult[]; error?: string }> {
  const trimmed = term.trim();
  if (!trimmed || trimmed.length < 2) {
    return { success: true, data: [] };
  }

  try {
    const results = await searchMedia(trimmed, type, perPage);
    return { success: true, data: results };
  } catch (error) {
    console.error("AniList search error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}
