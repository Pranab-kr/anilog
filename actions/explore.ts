"use server";

import { anilistFetch } from "@/lib/anilist/client";

/* ================================================================
   TYPES
   ================================================================ */

export interface ExploreMediaItem {
  id: number;
  title: { romaji: string | null; english: string | null; native: string | null };
  type: "ANIME" | "MANGA" | null;
  format: string | null;
  status: string | null;
  coverImage: { large: string | null; extraLarge: string | null };
  bannerImage: string | null;
  averageScore: number | null;
  popularity: number | null;
  episodes: number | null;
  chapters: number | null;
  season: string | null;
  seasonYear: number | null;
  genres: string[];
  nextAiringEpisode: {
    episode: number;
    airingAt: number;
    timeUntilAiring: number;
  } | null;
  startDate: { year: number | null; month: number | null; day: number | null } | null;
  endDate: { year: number | null; month: number | null; day: number | null } | null;
}

export interface AiringScheduleItem {
  id: number;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
  media: {
    id: number;
    title: { romaji: string | null; english: string | null };
    coverImage: { large: string | null };
    status: string | null;
  };
}

type SortOption = "POPULARITY_DESC" | "SCORE_DESC" | "START_DATE" | "END_DATE";

/* ================================================================
   MEDIA FRAGMENT
   ================================================================ */

const EXPLORE_MEDIA_FRAGMENT = `
  id
  title { romaji english native }
  type
  format
  status
  coverImage { large extraLarge }
  bannerImage
  averageScore
  popularity
  episodes
  chapters
  season
  seasonYear
  genres
  nextAiringEpisode { episode airingAt timeUntilAiring }
  startDate { year month day }
  endDate { year month day }
`;

/* ================================================================
   ACTIONS
   ================================================================ */

/**
 * Browse seasonal anime by season + year.
 * sort: POPULARITY_DESC | SCORE_DESC | START_DATE | END_DATE
 */
export async function getSeasonalAnime(
  season: "WINTER" | "SPRING" | "SUMMER" | "FALL",
  year: number,
  sort: SortOption = "POPULARITY_DESC",
  page = 1,
  perPage = 30,
): Promise<{ success: boolean; data?: ExploreMediaItem[]; hasNextPage?: boolean; error?: string }> {
  try {
    const data = await anilistFetch<{
      Page: {
        pageInfo: { hasNextPage: boolean };
        media: ExploreMediaItem[];
      };
    }>(
      `query ($season: MediaSeason!, $year: Int!, $sort: [MediaSort]!, $page: Int!, $perPage: Int!) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage }
          media(season: $season, seasonYear: $year, type: ANIME, sort: $sort, isAdult: false) {
            ${EXPLORE_MEDIA_FRAGMENT}
          }
        }
      }`,
      { season, year, sort: [sort], page, perPage },
    );
    return { success: true, data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch seasonal anime" };
  }
}

/** Top 100 anime or manga sorted by score. */
export async function getTopMedia(
  type: "ANIME" | "MANGA",
  sort: SortOption = "SCORE_DESC",
  page = 1,
  perPage = 30,
): Promise<{ success: boolean; data?: ExploreMediaItem[]; hasNextPage?: boolean; error?: string }> {
  try {
    const data = await anilistFetch<{
      Page: { pageInfo: { hasNextPage: boolean }; media: ExploreMediaItem[] };
    }>(
      `query ($type: MediaType!, $sort: [MediaSort]!, $page: Int!, $perPage: Int!) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage }
          media(type: $type, sort: $sort, isAdult: false) {
            ${EXPLORE_MEDIA_FRAGMENT}
          }
        }
      }`,
      { type, sort: [sort], page, perPage },
    );
    return { success: true, data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch top media" };
  }
}

/** Currently airing anime. */
export async function getAiringAnime(
  page = 1,
  perPage = 30,
): Promise<{ success: boolean; data?: ExploreMediaItem[]; hasNextPage?: boolean; error?: string }> {
  try {
    const data = await anilistFetch<{
      Page: { pageInfo: { hasNextPage: boolean }; media: ExploreMediaItem[] };
    }>(
      `query ($page: Int!, $perPage: Int!) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage }
          media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC, isAdult: false) {
            ${EXPLORE_MEDIA_FRAGMENT}
          }
        }
      }`,
      { page, perPage },
    );
    return { success: true, data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch airing anime" };
  }
}

/** Upcoming anime (status: NOT_YET_RELEASED). */
export async function getUpcomingAnime(
  page = 1,
  perPage = 30,
): Promise<{ success: boolean; data?: ExploreMediaItem[]; hasNextPage?: boolean; error?: string }> {
  try {
    const data = await anilistFetch<{
      Page: { pageInfo: { hasNextPage: boolean }; media: ExploreMediaItem[] };
    }>(
      `query ($page: Int!, $perPage: Int!) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage }
          media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) {
            ${EXPLORE_MEDIA_FRAGMENT}
          }
        }
      }`,
      { page, perPage },
    );
    return { success: true, data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch upcoming anime" };
  }
}

/** Top movies (format: MOVIE). */
export async function getTopMovies(
  page = 1,
  perPage = 30,
): Promise<{ success: boolean; data?: ExploreMediaItem[]; hasNextPage?: boolean; error?: string }> {
  try {
    const data = await anilistFetch<{
      Page: { pageInfo: { hasNextPage: boolean }; media: ExploreMediaItem[] };
    }>(
      `query ($page: Int!, $perPage: Int!) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage }
          media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC, isAdult: false) {
            ${EXPLORE_MEDIA_FRAGMENT}
          }
        }
      }`,
      { page, perPage },
    );
    return { success: true, data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch top movies" };
  }
}

/** Currently publishing manga. */
export async function getPublishingManga(
  page = 1,
  perPage = 30,
): Promise<{ success: boolean; data?: ExploreMediaItem[]; hasNextPage?: boolean; error?: string }> {
  try {
    const data = await anilistFetch<{
      Page: { pageInfo: { hasNextPage: boolean }; media: ExploreMediaItem[] };
    }>(
      `query ($page: Int!, $perPage: Int!) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage }
          media(type: MANGA, status: RELEASING, sort: POPULARITY_DESC, isAdult: false) {
            ${EXPLORE_MEDIA_FRAGMENT}
          }
        }
      }`,
      { page, perPage },
    );
    return { success: true, data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch publishing manga" };
  }
}

/** Upcoming manga. */
export async function getUpcomingManga(
  page = 1,
  perPage = 30,
): Promise<{ success: boolean; data?: ExploreMediaItem[]; hasNextPage?: boolean; error?: string }> {
  try {
    const data = await anilistFetch<{
      Page: { pageInfo: { hasNextPage: boolean }; media: ExploreMediaItem[] };
    }>(
      `query ($page: Int!, $perPage: Int!) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage }
          media(type: MANGA, status: NOT_YET_RELEASED, sort: POPULARITY_DESC, isAdult: false) {
            ${EXPLORE_MEDIA_FRAGMENT}
          }
        }
      }`,
      { page, perPage },
    );
    return { success: true, data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch upcoming manga" };
  }
}

/**
 * Weekly airing schedule — returns schedule items grouped by airing time.
 * weekStart / weekEnd are Unix timestamps (seconds).
 */
export async function getAiringSchedule(
  weekStart: number,
  weekEnd: number,
): Promise<{ success: boolean; data?: AiringScheduleItem[]; error?: string }> {
  try {
    const data = await anilistFetch<{
      Page: { airingSchedules: AiringScheduleItem[] };
    }>(
      `query ($weekStart: Int!, $weekEnd: Int!) {
        Page(perPage: 50) {
          airingSchedules(airingAt_greater: $weekStart, airingAt_lesser: $weekEnd, sort: TIME) {
            id
            airingAt
            timeUntilAiring
            episode
            media {
              id
              title { romaji english }
              coverImage { large }
              status
            }
          }
        }
      }`,
      { weekStart, weekEnd },
    );
    return { success: true, data: data.Page.airingSchedules };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch airing schedule" };
  }
}

/** Full-text search across anime & manga. */
export async function exploreSearch(
  term: string,
  type?: "ANIME" | "MANGA",
  page = 1,
  perPage = 20,
): Promise<{ success: boolean; data?: ExploreMediaItem[]; hasNextPage?: boolean; error?: string }> {
  const trimmed = term.trim();
  if (!trimmed || trimmed.length < 2) return { success: true, data: [] };
  try {
    const data = await anilistFetch<{
      Page: { pageInfo: { hasNextPage: boolean }; media: ExploreMediaItem[] };
    }>(
      `query ($search: String!, $type: MediaType, $page: Int!, $perPage: Int!) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { hasNextPage }
          media(search: $search, type: $type, sort: SEARCH_MATCH, isAdult: false) {
            ${EXPLORE_MEDIA_FRAGMENT}
          }
        }
      }`,
      { search: trimmed, type: type ?? null, page, perPage },
    );
    return { success: true, data: data.Page.media, hasNextPage: data.Page.pageInfo.hasNextPage };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Search failed" };
  }
}
