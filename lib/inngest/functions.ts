import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest/client";
import { anilistAccount, anilistImportJob, media } from "@/schema/media-schema";
import { deleteMediaListEntry, saveMediaListEntry } from "@/lib/anilist/client";
import { localStatusToAnilist } from "@/lib/anilist/mapping";
import {
  importForAniListUser,
  importPublicListForUser,
} from "@/lib/anilist/importer";

import type { MediaStatus } from "@/actions/media";

export const syncMediaToAniList = inngest.createFunction(
  {
    id: "sync-media-to-anilist",
    triggers: [{ event: "anilist/media.sync.requested" }],
    debounce: {
      key: "event.data.mediaId",
      period: "2s",
      timeout: "15s",
    },
    throttle: {
      limit: 25,
      period: "1m",
      burst: 5,
      key: "event.data.userId",
    },
    concurrency: {
      limit: 1,
      key: "event.data.mediaId",
    },
  },
  async ({ event, step }) => {
    const { mediaId, userId } = event.data as {
      mediaId: string;
      userId: string;
    };

    const row = await step.run("load media and account", async () => {
      const [mediaRow] = await db
        .select()
        .from(media)
        .where(and(eq(media.id, mediaId), eq(media.userId, userId)));

      if (!mediaRow?.anilistMediaId) return null;

      const [account] = await db
        .select()
        .from(anilistAccount)
        .where(eq(anilistAccount.userId, userId));

      if (!account) return null;

      return { mediaRow, accessToken: account.accessToken };
    });

    if (!row) return { skipped: true };

    await step.run("mark syncing", async () => {
      await db
        .update(media)
        .set({
          anilistSyncStatus: "syncing",
          anilistSyncError: null,
          updatedAt: new Date(),
        })
        .where(and(eq(media.id, mediaId), eq(media.userId, userId)));
    });

    try {
      const entryId = await step.run("save anilist entry", async () => {
        return saveMediaListEntry(
          {
            mediaId: row.mediaRow.anilistMediaId as number,
            status: localStatusToAnilist(row.mediaRow.status as MediaStatus),
            progress: row.mediaRow.progress,
            score: row.mediaRow.rating ?? undefined,
            notes: row.mediaRow.notes ?? undefined,
          },
          row.accessToken,
        );
      });

      await step.run("mark synced", async () => {
        await db
          .update(media)
          .set({
            anilistListEntryId: entryId,
            anilistSyncStatus: "synced",
            anilistSyncError: null,
            anilistSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(media.id, mediaId), eq(media.userId, userId)));
      });

      return { synced: true, entryId };
    } catch (error) {
      await step.run("mark sync failed", async () => {
        await db
          .update(media)
          .set({
            anilistSyncStatus: "failed",
            anilistSyncError:
              error instanceof Error ? error.message : "AniList sync failed",
            updatedAt: new Date(),
          })
          .where(and(eq(media.id, mediaId), eq(media.userId, userId)));
      });
      throw error;
    }
  },
);

export const deleteMediaFromAniList = inngest.createFunction(
  {
    id: "delete-media-from-anilist",
    triggers: [{ event: "anilist/media.delete.requested" }],
    throttle: {
      limit: 25,
      period: "1m",
      burst: 5,
      key: "event.data.userId",
    },
  },
  async ({ event, step }) => {
    const { userId, anilistListEntryId } = event.data as {
      userId: string;
      anilistListEntryId: number;
    };

    const account = await step.run("load account", async () => {
      const [row] = await db
        .select()
        .from(anilistAccount)
        .where(eq(anilistAccount.userId, userId));
      return row;
    });

    if (!account) return { skipped: true };

    await step.run("delete anilist entry", async () => {
      await deleteMediaListEntry(anilistListEntryId, account.accessToken);
    });

    return { deleted: true };
  },
);

export const runAniListImport = inngest.createFunction(
  {
    id: "run-anilist-import",
    triggers: [{ event: "anilist/import.requested" }],
    concurrency: {
      limit: 1,
      key: "event.data.userId",
    },
  },
  async ({ event, step }) => {
    const { jobId, userId } = event.data as {
      jobId: string;
      userId: string;
    };

    const job = await step.run("mark import running", async () => {
      const [row] = await db
        .update(anilistImportJob)
        .set({
          status: "running",
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(anilistImportJob.id, jobId), eq(anilistImportJob.userId, userId)))
        .returning();

      return row;
    });

    if (!job) return { skipped: true };

    try {
      const result = await step.run("import anilist list", async () => {
        if (job.source === "public") {
          return importPublicListForUser(userId, job.username ?? "");
        }

        const [account] = await db
          .select()
          .from(anilistAccount)
          .where(eq(anilistAccount.userId, userId));

        if (!account) {
          return { success: false, error: "AniList is not connected" };
        }

        const importResult = await importForAniListUser(
          userId,
          account.anilistUserId,
          account.accessToken,
        );

        return { ...importResult, anilistUserId: account.anilistUserId };
      });

      await step.run("finish import job", async () => {
        await db
          .update(anilistImportJob)
          .set({
            status: result.success ? "completed" : "failed",
            anilistUserId: result.anilistUserId ?? job.anilistUserId,
            imported: result.data?.imported ?? 0,
            updated: result.data?.skipped ?? 0,
            errors: result.data?.errors.length
              ? result.data.errors.join("\n")
              : null,
            error: result.success ? null : result.error ?? "Import failed",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(anilistImportJob.id, jobId), eq(anilistImportJob.userId, userId)));
      });

      if (!result.success) {
        throw new Error(result.error ?? "Import failed");
      }

      return { imported: result.data?.imported ?? 0, updated: result.data?.skipped ?? 0 };
    } catch (error) {
      await step.run("mark import failed", async () => {
        await db
          .update(anilistImportJob)
          .set({
            status: "failed",
            error: error instanceof Error ? error.message : "Import failed",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(anilistImportJob.id, jobId), eq(anilistImportJob.userId, userId)));
      });
      throw error;
    }
  },
);

export const addMediaEntry = inngest.createFunction(
  {
    id: "add-media-entry",
    triggers: [{ event: "media/add.requested" }],
    // Dedupe rapid double-clicks on the same AniList media by the same user
    idempotency: "event.data.userId + '-' + string(event.data.anilistMediaId ?? event.data.title)",
  },
  async ({ event, step }) => {
    const payload = event.data as {
      userId: string;
      title: string;
      type: "anime" | "manga";
      status: string;
      coverImage: string | null;
      total: number | null;
      anilistMediaId: number | null;
    };

    const created = await step.run("insert media row", async () => {
      // Duplicate check by anilistMediaId
      if (payload.anilistMediaId) {
        const [existing] = await db
          .select({ id: media.id, title: media.title })
          .from(media)
          .where(
            and(
              eq(media.userId, payload.userId),
              eq(media.anilistMediaId, payload.anilistMediaId),
            ),
          );
        if (existing) return { skipped: true, reason: "duplicate_anilist_id" };
      }

      // Duplicate check by title and type
      const [existingByTitle] = await db
        .select({ id: media.id })
        .from(media)
        .where(
          and(
            eq(media.userId, payload.userId),
            eq(media.title, payload.title),
            eq(media.type, payload.type),
          ),
        );
      if (existingByTitle) return { skipped: true, reason: "duplicate_title" };

      const [row] = await db
        .insert(media)
        .values({
          title: payload.title,
          type: payload.type,
          status: payload.status as import("@/actions/media").MediaStatus,
          coverImage: payload.coverImage,
          progress: 0,
          total: payload.total,
          userId: payload.userId,
          anilistMediaId: payload.anilistMediaId,
          anilistSyncStatus: payload.anilistMediaId ? "pending" : "idle",
        })
        .returning();

      return { inserted: true, mediaId: row.id };
    });

    if ("skipped" in created && created.skipped) {
      return created;
    }

    if ("inserted" in created && created.mediaId && payload.anilistMediaId) {
      await step.run("enqueue anilist sync", async () => {
        await inngest.send({
          name: "anilist/media.sync.requested",
          data: { userId: payload.userId, mediaId: created.mediaId as string },
        });
      });
    }

    return created;
  },
);

export const functions = [
  syncMediaToAniList,
  deleteMediaFromAniList,
  runAniListImport,
  addMediaEntry,
];
