import "server-only";
import type {
  AniListCollection,
  AniListListEntry,
  AniListMediaType,
  AniListSearchResult,
  AniListStatus,
  AniListStatusList,
  AniListViewer,
} from "./types";

/**
 * Minimal AniList GraphQL client.
 *
 * - Single endpoint: https://graphql.anilist.co
 * - Authenticated by attaching `Authorization: Bearer <token>` for the user's
 *   connected access token (unauthenticated requests work for public reads).
 * - Rate limit handling: AniList normally allows 90 req/min (currently degraded
 *   to ~30/min). On 429 we back off with exponential delay and retry a few
 *   times before giving up.
 */

const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const MAX_RETRIES = 4;

export class AniListError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "AniListError";
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; status?: number }>;
}

/** Low-level GraphQL request with retry/backoff on rate limiting. */
export async function anilistFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  accessToken?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      });

      // Rate limited — wait and retry.
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After")) || 2 + attempt * 2;
        if (attempt === MAX_RETRIES) {
          throw new AniListError("AniList rate limit exceeded", 429, retryAfter * 1000);
        }
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!res.ok) {
        // 5xx is transient — retry. 4xx (other than 429) is a real error.
        if (res.status >= 500 && attempt < MAX_RETRIES) {
          await sleep(2 ** attempt * 1000);
          continue;
        }
        let message = `AniList request failed (${res.status})`;
        try {
          const body = (await res.json()) as GraphQLResponse<unknown>;
          if (body.errors?.[0]?.message) message = body.errors[0].message;
        } catch {
          /* ignore parse errors */
        }
        throw new AniListError(message, res.status);
      }

      const body = (await res.json()) as GraphQLResponse<T>;

      if (body.errors && body.errors.length > 0) {
        throw new AniListError(
          body.errors[0]?.message ?? "AniList GraphQL error",
          body.errors[0]?.status ?? 400,
        );
      }

      if (!body.data) {
        throw new AniListError("AniList returned no data", 500);
      }

      return body.data;
    } catch (err) {
      // Network errors are retriable.
      if (err instanceof AniListError && err.status !== 429 && err.status < 500) {
        throw err;
      }
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(2 ** attempt * 1000);
        continue;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new AniListError("AniList request failed after retries", 500);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ============================================================
   QUERIES & MUTATIONS
   Keep selections narrow — only what the app uses.
   ============================================================ */

const MEDIA_FRAGMENT = `
  id
  mediaId
  status
  progress
  score(format: POINT_10)
  notes
  updatedAt
  startedAt { year month day }
  completedAt { year month day }
  media {
    id
    title { romaji english native }
    type
    coverImage { large medium }
    episodes
    chapters
  }
`;

/** Viewer — identify the authenticated user (id + name). */
export async function getViewer(accessToken: string): Promise<AniListViewer> {
  const data = await anilistFetch<{ Viewer: { id: number; name: string } }>(
    `query { Viewer { id name } }`,
    {},
    accessToken,
  );
  return data.Viewer;
}

/** A user's full anime/manga list collection (public reads need no token). */
export async function getMediaListCollection(
  userId: number,
  type: AniListMediaType,
  accessToken?: string,
): Promise<AniListCollection> {
  const data = await anilistFetch<{
    MediaListCollection: {
      lists: Array<{
        status: AniListStatus | null;
        entries: Array<Omit<AniListListEntry, never>>;
      }>;
    };
  }>(
    `query ($userId: Int!, $type: MediaType!) {
      MediaListCollection(userId: $userId, type: $type) {
        lists {
          status
          entries { ${MEDIA_FRAGMENT} }
        }
      }
    }`,
    { userId, type },
    accessToken,
  );

  const lists: AniListStatusList[] = (data.MediaListCollection?.lists ?? []).map(
    (l) => ({ status: l.status, entries: l.entries ?? [] }),
  );

  return { userId, lists };
}

/** Save (create or update) a media list entry. Returns the entry id. */
export async function saveMediaListEntry(
  input: {
    mediaId: number;
    status: AniListStatus;
    progress: number;
    score?: number;
    notes?: string;
  },
  accessToken: string,
): Promise<number> {
  const data = await anilistFetch<{ SaveMediaListEntry: { id: number } }>(
    `mutation ($mediaId: Int!, $status: MediaListStatus!, $progress: Int!, $score: Float, $notes: String) {
      SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score, notes: $notes) {
        id
      }
    }`,
    {
      mediaId: input.mediaId,
      status: input.status,
      progress: input.progress,
      score: input.score ?? 0,
      notes: input.notes ?? null,
    },
    accessToken,
  );
  return data.SaveMediaListEntry.id;
}

/** Delete a media list entry by its AniList entry id. */
export async function deleteMediaListEntry(
  entryId: number,
  accessToken: string,
): Promise<void> {
  await anilistFetch<{ DeleteMediaListEntry: { deleted: boolean } }>(
    `mutation ($id: Int!) {
      DeleteMediaListEntry(id: $id) { deleted }
    }`,
    { id: entryId },
    accessToken,
  );
}

/** Search anime/manga by title. Public — no token needed. */
export async function searchMedia(
  term: string,
  type: AniListMediaType,
  perPage = 10,
): Promise<AniListSearchResult[]> {
  const data = await anilistFetch<{
    Page: { media: AniListSearchResult[] };
  }>(
    `query ($search: String!, $type: MediaType!, $perPage: Int!) {
      Page(perPage: $perPage) {
        media(search: $search, type: $type, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          type
          coverImage { large medium }
          episodes
          chapters
          averageScore
        }
      }
    }`,
    { search: term, type, perPage },
  );
  return data.Page.media;
}

/** Look up a user id by username (for public-list import). Public. */
export async function getUserIdByName(
  username: string,
): Promise<number | null> {
  const data = await anilistFetch<{ User: { id: number } | null }>(
    `query ($name: String!) { User(name: $name) { id } }`,
    { name: username },
  );
  return data.User?.id ?? null;
}
