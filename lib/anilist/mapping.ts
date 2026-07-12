// Client-safe mapping helpers — no server-only import so these can be used in
// client components (e.g. the add-entry modal search).
import type { AniListListEntry, AniListMediaType, AniListStatus } from "./types";
import type { MediaStatus, MediaType } from "@/actions/media";

/**
 * Mapping between AniList and the local media model.
 *
 * AniList statuses: CURRENT, PLANNING, COMPLETED, DROPPED, PAUSED, REPEATING
 * Local statuses: watching, completed, plan
 *
 * Repeated viewings collapse into "completed" locally (we don't model repeats).
 * PAUSED and DROPPED round-trip to the nearest local status; on a write-back
 * we prefer to preserve the AniList status if one already exists there, but for
 * a pure local→AniList write we map as below.
 */

const TO_LOCAL: Record<string, MediaStatus> = {
  CURRENT: "watching",
  REPEATING: "completed",
  COMPLETED: "completed",
  PLANNING: "plan",
  PAUSED: "watching",
  DROPPED: "plan",
};

/** Map an AniList MediaListStatus to our local MediaStatus. */
export function anilistStatusToLocal(status: string | null): MediaStatus {
  if (!status) return "plan";
  return TO_LOCAL[status] ?? "plan";
}

const TO_ANILIST: Record<MediaStatus, AniListStatus> = {
  watching: "CURRENT",
  completed: "COMPLETED",
  plan: "PLANNING",
};

/** Map our local MediaStatus to the closest AniList MediaListStatus. */
export function localStatusToAnilist(status: MediaStatus): AniListStatus {
  return TO_ANILIST[status] ?? "PLANNING";
}

/** AniList uses ANIME / MANGA. manhwa is merged into manga. */
export function localTypeToAnilist(type: MediaType): AniListMediaType {
  return type === "anime" ? "ANIME" : "MANGA";
}

/** Inverse — used when ingesting AniList entries. */
export function anilistTypeToLocal(type: AniListMediaType | null): MediaType {
  return type === "ANIME" ? "anime" : "manga";
}

/** Pick the best available title for display. */
export function pickTitle(entry: {
  title: { romaji: string | null; english: string | null; native: string | null };
}): string {
  return entry.title.english || entry.title.romaji || entry.title.native || "Untitled";
}

/** Total count: episodes for anime, chapters for manga. */
export function pickTotal(entry: AniListListEntry): number | null {
  const m = entry.media;
  if (entry.media.type === "ANIME") return m.episodes;
  return m.chapters;
}

/** Cover image: prefer large, fall back to medium. */
export function pickCover(entry: {
  coverImage: { large: string | null; medium: string | null };
}): string | null {
  return entry.coverImage.large || entry.coverImage.medium || null;
}
