// Shared AniList GraphQL types.
// These intentionally capture only the fields the app uses — AniList's schema
// is huge, so we keep narrow selections.

/** AniList MediaList status values. */
export type AniListStatus =
  | "CURRENT"
  | "PLANNING"
  | "COMPLETED"
  | "DROPPED"
  | "PAUSED"
  | "REPEATING";

/** AniList media type. manhwa/manhua are all MANGA on AniList's side. */
export type AniListMediaType = "ANIME" | "MANGA";

/** The connected viewer (Viewer query). */
export interface AniListViewer {
  id: number;
  name: string;
  avatar?: string | null;
}

/** A single entry inside a MediaListCollection list. */
export interface AniListListEntry {
  id: number; // MediaList entry id (needed for updates/deletes)
  mediaId: number;
  status: AniListStatus;
  progress: number;
  score: number;
  notes: string | null;
  startedAt: { year: number | null; month: number | null; day: number | null };
  completedAt: { year: number | null; month: number | null; day: number | null };
  media: {
    id: number;
    title: { romaji: string | null; english: string | null; native: string | null };
    type: AniListMediaType | null;
    coverImage: { large: string | null; medium: string | null };
    episodes: number | null;
    chapters: number | null;
  };
}

/** One status-grouped list from a MediaListCollection. */
export interface AniListStatusList {
  status: AniListStatus | null;
  entries: AniListListEntry[];
}

/** Result of fetching a user's full list collection. */
export interface AniListCollection {
  userId: number;
  lists: AniListStatusList[];
}

/** A search result from the Page query. */
export interface AniListSearchResult {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  type: AniListMediaType | null;
  coverImage: { large: string | null; medium: string | null };
  episodes: number | null;
  chapters: number | null;
  averageScore: number | null;
}
