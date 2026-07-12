"use server";

import "server-only";

import { db } from "@/lib/db";
import { media, anilistAccount } from "@/schema/media-schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getMediaListCollection, getUserIdByName } from "@/lib/anilist/client";
import { _getAniListAccessToken } from "@/actions/anilist";
import {
  anilistStatusToLocal,
  anilistTypeToLocal,
  pickTitle,
  pickTotal,
  pickCover,
  localTypeToAnilist,
} from "@/lib/anilist/mapping";
import type { AniListMediaType } from "@/lib/anilist/types";

async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

/* ------------------------------------------------------------------
   Import a PUBLIC user's list by AniList username
   ------------------------------------------------------------------ */

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Import a public AniList user's anime + manga list into the current user's
 * local library. Uses upsert by (userId, anilistMediaId) so re-running is
 * safe — existing entries are updated in place.
 *
 * No AniList token needed (public reads).
 */
export async function importPublicAniListList(
  username: string,
): Promise<{
  success: boolean;
  data?: ImportResult;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();

    // 1. Resolve username → AniList userId
    const anilistUserId = await getUserIdByName(username);
    if (!anilistUserId) {
      return { success: false, error: `AniList user "${username}" not found` };
    }

    return await _importForAniListUser(user.id, anilistUserId, undefined);
  } catch (error) {
    console.error("Import error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to import AniList list",
    };
  }
}

/* ------------------------------------------------------------------
   Sync from the connected user's own AniList account
   ------------------------------------------------------------------ */

/**
 * Pull the connected user's anime + manga lists from AniList and upsert into
 * the local library. Same upsert logic as import, but authenticated.
 */
export async function syncFromAniList(): Promise<{
  success: boolean;
  data?: ImportResult;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    const token = await _getAniListAccessToken();

    if (!token) {
      return { success: false, error: "AniList is not connected" };
    }

    // Look up the connected AniList user id
    const [acct] = await db
      .select()
      .from(anilistAccount)
      .where(eq(anilistAccount.userId, user.id));

    if (!acct) {
      return { success: false, error: "AniList is not connected" };
    }

    return await _importForAniListUser(user.id, acct.anilistUserId, token);
  } catch (error) {
    console.error("Sync error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to sync from AniList",
    };
  }
}

/* ------------------------------------------------------------------
   Shared upsert logic
   ------------------------------------------------------------------ */

async function _importForAniListUser(
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

      for (const list of collection.lists) {
        for (const entry of list.entries) {
          try {
            const title = pickTitle(entry.media);
            const localType = anilistTypeToLocal(entry.media.type);
            const localStatus = anilistStatusToLocal(entry.status);
            const total = pickTotal(entry);
            const cover = pickCover(entry.media);

            // Upsert: if a row with the same anilistMediaId exists for this
            // user, update it; otherwise insert.
            const [existing] = await db
              .select()
              .from(media)
              .where(
                eq(media.anilistMediaId, entry.mediaId),
              )
              .then((rows) => rows.filter((r) => r.userId === appUserId));

            if (existing) {
              await db
                .update(media)
                .set({
                  title,
                  type: localType,
                  status: localStatus,
                  progress: entry.progress,
                  total,
                  coverImage: cover,
                  notes: entry.notes ?? null,
                  anilistListEntryId: entry.id,
                  updatedAt: new Date(),
                })
                .where(eq(media.id, existing.id));
              result.skipped++;
            } else {
              await db.insert(media).values({
                title,
                type: localType,
                status: localStatus,
                progress: entry.progress,
                total,
                coverImage: cover,
                notes: entry.notes ?? null,
                userId: appUserId,
                anilistMediaId: entry.mediaId,
                anilistListEntryId: entry.id,
              });
              result.imported++;
            }
          } catch (entryErr) {
            result.errors.push(
              entryErr instanceof Error ? entryErr.message : String(entryErr),
            );
          }
        }
      }
    } catch (typeErr) {
      result.errors.push(
        `Failed to fetch ${type} list: ${
          typeErr instanceof Error ? typeErr.message : String(typeErr)
        }`,
      );
    }

    // Throttle between type requests to respect rate limits.
    if (type === "ANIME") {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  revalidatePath("/");

  return { success: true, data: result };
}
