import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { media } from "@/schema/media-schema";
import { getMediaListCollection, getUserIdByName } from "@/lib/anilist/client";
import {
  anilistStatusToLocal,
  anilistTypeToLocal,
  pickCover,
  pickTitle,
  pickTotal,
} from "@/lib/anilist/mapping";
import type { AniListMediaType } from "@/lib/anilist/types";

type MediaInsert = typeof media.$inferInsert;
type MediaUpdate = Partial<MediaInsert>;

interface NormalizedAniListEntry {
  title: string;
  type: "anime" | "manga";
  status: "watching" | "completed" | "plan";
  progress: number;
  total: number | null;
  coverImage: string | null;
  notes: string | null;
  anilistMediaId: number;
  anilistListEntryId: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importPublicListForUser(
  appUserId: string,
  username: string,
): Promise<{ success: boolean; data?: ImportResult; error?: string; anilistUserId?: number }> {
  const normalizedUsername = normalizeAniListUsername(username);

  if (!normalizedUsername) {
    return { success: false, error: "AniList username is required" };
  }

  const anilistUserId = await getUserIdByName(normalizedUsername);
  if (!anilistUserId) {
    return {
      success: false,
      error: `AniList user "${normalizedUsername}" not found`,
    };
  }

  const result = await importForAniListUser(appUserId, anilistUserId, undefined);
  return { ...result, anilistUserId };
}

export async function importForAniListUser(
  appUserId: string,
  anilistUserId: number,
  accessToken: string | undefined,
): Promise<{ success: boolean; data?: ImportResult; error?: string }> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  for (const type of ["ANIME", "MANGA"] as AniListMediaType[]) {
    try {
      const collection = await getMediaListCollection(
        anilistUserId,
        type,
        accessToken,
      );

      const entriesByMediaId = new Map<number, NormalizedAniListEntry>();

      for (const list of collection.lists) {
        for (const entry of list.entries) {
          if (!entry.media?.id) {
            result.errors.push(`Skipped AniList entry ${entry.id}: missing media`);
            continue;
          }

          entriesByMediaId.set(entry.mediaId, {
            title: pickTitle(entry.media),
            type: anilistTypeToLocal(entry.media.type),
            status: anilistStatusToLocal(entry.status),
            progress: entry.progress,
            total: pickTotal(entry),
            coverImage: pickCover(entry.media),
            notes: entry.notes ?? null,
            anilistMediaId: entry.mediaId,
            anilistListEntryId: entry.id,
          });
        }
      }

      await importEntriesForType(appUserId, [...entriesByMediaId.values()], result);
    } catch (typeErr) {
      result.errors.push(
        `Failed to fetch ${type} list: ${
          typeErr instanceof Error ? typeErr.message : String(typeErr)
        }`,
      );
    }

    if (type === "ANIME") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  revalidatePath("/");

  if (result.imported === 0 && result.skipped === 0 && result.errors.length > 0) {
    return {
      success: false,
      data: result,
      error: result.errors.join("\n"),
    };
  }

  return { success: true, data: result };
}

async function importEntriesForType(
  appUserId: string,
  entries: NormalizedAniListEntry[],
  result: ImportResult,
) {
  if (entries.length === 0) return;

  const anilistMediaIds = entries.map((entry) => entry.anilistMediaId);

  const existingLinkedRows = await db
    .select()
    .from(media)
    .where(
      and(
        eq(media.userId, appUserId),
        inArray(media.anilistMediaId, anilistMediaIds),
      ),
    );

  const existingByAniListId = new Map(
    existingLinkedRows
      .filter((row) => row.anilistMediaId !== null)
      .map((row) => [row.anilistMediaId as number, row]),
  );

  const unmatchedEntries = entries.filter(
    (entry) => !existingByAniListId.has(entry.anilistMediaId),
  );

  const manualRows = unmatchedEntries.length
    ? await db
        .select()
        .from(media)
        .where(
          and(
            eq(media.userId, appUserId),
            inArray(
              media.title,
              unmatchedEntries.map((entry) => entry.title),
            ),
          ),
        )
    : [];

  const manualByTitle = new Map(
    manualRows
      .filter((row) => row.anilistMediaId === null)
      .map((row) => [normalizeTitle(row.title), row]),
  );

  const updates: Array<{
    id: string;
    data: MediaUpdate;
    countAs: "imported" | "skipped";
  }> = [];
  const inserts: MediaInsert[] = [];
  const now = new Date();

  for (const entry of entries) {
    const existing = existingByAniListId.get(entry.anilistMediaId);

    if (existing) {
      updates.push({
        id: existing.id,
        countAs: "skipped",
        data: {
          title: entry.title,
          type: entry.type,
          status: entry.status,
          progress: entry.progress,
          total: entry.total,
          coverImage: entry.coverImage,
          notes: entry.notes,
          anilistListEntryId: entry.anilistListEntryId,
          anilistSyncStatus: "synced",
          anilistSyncError: null,
          anilistSyncedAt: now,
          updatedAt: now,
        },
      });
      continue;
    }

    const manualEntry = manualByTitle.get(normalizeTitle(entry.title));

    if (manualEntry) {
      updates.push({
        id: manualEntry.id,
        countAs: "imported",
        data: {
          type: entry.type,
          status: entry.status,
          progress: entry.progress,
          total: entry.total ?? manualEntry.total,
          coverImage: entry.coverImage || manualEntry.coverImage,
          anilistMediaId: entry.anilistMediaId,
          anilistListEntryId: entry.anilistListEntryId,
          anilistSyncStatus: "synced",
          anilistSyncError: null,
          anilistSyncedAt: now,
          updatedAt: now,
        },
      });
      manualByTitle.delete(normalizeTitle(entry.title));
      continue;
    }

    inserts.push({
      title: entry.title,
      type: entry.type,
      status: entry.status,
      progress: entry.progress,
      total: entry.total,
      coverImage: entry.coverImage,
      notes: entry.notes,
      userId: appUserId,
      anilistMediaId: entry.anilistMediaId,
      anilistListEntryId: entry.anilistListEntryId,
      anilistSyncStatus: "synced",
      anilistSyncedAt: now,
    });
  }

  for (const chunk of chunkArray(inserts, 200)) {
    try {
      await db.insert(media).values(chunk);
      result.imported += chunk.length;
    } catch (error) {
      result.errors.push(
        `Failed to insert ${chunk.length} AniList entries: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  await runInChunks(
    updates.map((update) => async () => {
      try {
        await db.update(media).set(update.data).where(eq(media.id, update.id));
        result[update.countAs]++;
      } catch (error) {
        result.errors.push(
          `Failed to update "${update.data.title ?? update.id}": ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }),
    25,
  );
}

export function normalizeAniListUsername(input: string): string {
  const value = input.trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    if (url.hostname.endsWith("anilist.co")) {
      const [, userSegment, username] = url.pathname.split("/");
      if (userSegment?.toLowerCase() === "user" && username) {
        return decodeURIComponent(username).replace(/^@/, "").trim();
      }
    }
  } catch {
    // Plain usernames are expected; URL parsing failure is not an error.
  }

  return value.replace(/^@/, "").trim();
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function runInChunks(tasks: Array<() => Promise<void>>, size: number) {
  for (const chunk of chunkArray(tasks, size)) {
    await Promise.all(chunk.map((task) => task()));
  }
}
