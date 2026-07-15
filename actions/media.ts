"use server";

import { db } from "@/lib/db";
import { media } from "@/schema/media-schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { and, asc, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendInngestEvent } from "@/lib/inngest/client";

// Types
export type MediaType = "anime" | "manga";
export type MediaStatus = "watching" | "rewatching" | "completed" | "paused" | "dropped" | "plan";
export type AniListSyncStatus = "idle" | "pending" | "syncing" | "synced" | "failed";
export type MediaSort = "title" | "score" | "progress" | "updatedAt" | "createdAt";

export interface CreateMediaInput {
  title: string;
  type: MediaType;
  status?: MediaStatus;
  coverImage?: string | null;
  progress?: number;
  total?: number | null;
  rating?: number | null;
  notes?: string | null;
  anilistMediaId?: number | null;
}

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  status: MediaStatus;
  coverImage: string | null;
  progress: number;
  total: number | null;
  rating: number | null; // 0.0–10.0
  notes: string | null;
  userId: string;
  anilistMediaId: number | null;
  anilistListEntryId: number | null;
  anilistSyncStatus: AniListSyncStatus;
  anilistSyncError: string | null;
  anilistSyncedAt: Date | null;
  anilistUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateMediaInput {
  id: string;
  title?: string;
  type?: MediaType;
  status?: MediaStatus;
  coverImage?: string | null;
  progress?: number;
  total?: number | null;
  rating?: number | null; // 0.0–10.0
  notes?: string | null;
}

export interface MediaPageInput {
  type?: MediaType;
  status?: MediaStatus | "All";
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: MediaSort;
}

export interface MediaPage {
  items: MediaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Helper to get current user
async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session.user;
}


// CREATE - Add new media entry
export async function createMedia(input: CreateMediaInput): Promise<{ success: boolean; data?: MediaItem; error?: string }> {
  try {
    const user = await getCurrentUser();

    // Check for duplicate by anilistMediaId (if provided)
    if (input.anilistMediaId) {
      const [existing] = await db
        .select()
        .from(media)
        .where(and(eq(media.userId, user.id), eq(media.anilistMediaId, input.anilistMediaId)));

      if (existing) {
        return { success: false, error: `"${existing.title}" is already in your list` };
      }
    }

    // Check for duplicate by title
    const [existingByTitle] = await db
      .select()
      .from(media)
      .where(and(eq(media.userId, user.id), eq(media.title, input.title)));

    if (existingByTitle) {
      return { success: false, error: `"${input.title}" is already in your list` };
    }

    const [created] = await db
      .insert(media)
      .values({
        title: input.title,
        type: input.type,
        status: input.status ?? "plan",
        coverImage: input.coverImage ?? null,
        progress: input.progress ?? 0,
        total: input.total ?? null,
        rating: input.rating ?? null,
        notes: input.notes ?? null,
        userId: user.id,
        anilistMediaId: input.anilistMediaId ?? null,
        anilistSyncStatus: input.anilistMediaId ? "pending" : "idle",
      })
      .returning();

    if (created.anilistMediaId) {
      await enqueueMediaSync(user.id, created.id);
    }

    revalidatePath("/");

    return { success: true, data: created as MediaItem };
  } catch (error) {
    console.error("Error creating media:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create entry",
    };
  }
}

// READ - Get a paginated media page for current user
export async function getMediaPage(input: MediaPageInput = {}): Promise<{
  success: boolean;
  data?: MediaPage;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(60, Math.max(1, input.pageSize ?? 24));
    const offset = (page - 1) * pageSize;
    const conditions: SQL[] = [eq(media.userId, user.id)];

    if (input.type) {
      conditions.push(eq(media.type, input.type));
    }

    if (input.status && input.status !== "All") {
      conditions.push(eq(media.status, input.status));
    }

    const search = input.search?.trim();
    if (search) {
      conditions.push(ilike(media.title, `%${search}%`));
    }

    const where = and(...conditions);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(media)
      .where(where);

    const sortCol = (() => {
      switch (input.sort) {
        case "title":     return [asc(media.title)];
        case "score":     return [sql`${media.rating} DESC NULLS LAST`, desc(media.updatedAt)];
        case "progress":  return [desc(media.progress), desc(media.updatedAt)];
        case "createdAt": return [desc(media.createdAt)];
        // "Last Updated": prefer AniList's own per-entry timestamp; fall back to local updatedAt
        default:          return [
          sql`COALESCE(${media.anilistUpdatedAt}, ${media.updatedAt}) DESC`,
          desc(media.createdAt),
        ];
      }
    })();

    const items = await db
      .select()
      .from(media)
      .where(where)
      .orderBy(...sortCol)
      .limit(pageSize)
      .offset(offset);

    const total = countRow?.count ?? 0;

    return {
      success: true,
      data: {
        items: items as MediaItem[],
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  } catch (error) {
    console.error("Error fetching media page:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch media",
    };
  }
}

// READ - Get single media by ID
export async function getMediaById(id: string): Promise<{ success: boolean; data?: MediaItem; error?: string }> {
  try {
    const user = await getCurrentUser();

    const [mediaItem] = await db
      .select()
      .from(media)
      .where(and(eq(media.id, id), eq(media.userId, user.id)));

    if (!mediaItem) {
      return {
        success: false,
        error: "Media not found",
      };
    }

    return {
      success: true,
      data: mediaItem as MediaItem,
    };
  } catch (error) {
    console.error("Error fetching media:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch media",
    };
  }
}

// UPDATE - Update media
export async function updateMedia(input: UpdateMediaInput): Promise<{ success: boolean; data?: MediaItem; error?: string }> {
  try {
    const user = await getCurrentUser();

    // First check if the media belongs to the user
    const [existing] = await db
      .select()
      .from(media)
      .where(and(eq(media.id, input.id), eq(media.userId, user.id)));

    if (!existing) {
      return {
        success: false,
        error: "Media not found or unauthorized",
      };
    }

    // Check for duplicate title (if title is being updated)
    if (input.title !== undefined && input.title !== existing.title) {
      const [duplicateMedia] = await db
        .select()
        .from(media)
        .where(and(eq(media.title, input.title), eq(media.userId, user.id)));

      if (duplicateMedia) {
        return {
          success: false,
          error: `A media with the title "${input.title}" already exists in your list`,
        };
      }
    }

    const updateData: Partial<typeof media.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.coverImage !== undefined) updateData.coverImage = input.coverImage;
    if (input.progress !== undefined) updateData.progress = input.progress;
    if (input.total !== undefined) updateData.total = input.total;
    if (input.rating !== undefined) updateData.rating = input.rating;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (existing.anilistMediaId) {
      updateData.anilistSyncStatus = "pending";
      updateData.anilistSyncError = null;
    }

    const [updatedMedia] = await db
      .update(media)
      .set(updateData)
      .where(and(eq(media.id, input.id), eq(media.userId, user.id)))
      .returning();

    if (updatedMedia.anilistMediaId) {
      await enqueueMediaSync(user.id, updatedMedia.id);
    }

    revalidatePath("/");

    return {
      success: true,
      data: updatedMedia as MediaItem,
    };
  } catch (error) {
    console.error("Error updating media:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update media",
    };
  }
}

// UPDATE - Update progress only (quick update)
export async function updateMediaProgress(
  id: string,
  progress: number
): Promise<{ success: boolean; data?: MediaItem; error?: string }> {
  try {
    const user = await getCurrentUser();

    // Get current media to determine new status
    const [existing] = await db
      .select()
      .from(media)
      .where(and(eq(media.id, id), eq(media.userId, user.id)));

    if (!existing) {
      return {
        success: false,
        error: "Media not found or unauthorized",
      };
    }

    // Auto-update status based on progress
    let newStatus: MediaStatus = existing.status as MediaStatus;
    if (progress === 0) {
      newStatus = "plan";
    } else if (existing.total && progress >= existing.total) {
      newStatus = "completed";
    } else if (progress > 0 && existing.status === "plan") {
      // Only bump plan → watching; preserve watching/paused/dropped/rewatching
      newStatus = "watching";
    }

    const [updatedMedia] = await db
      .update(media)
      .set({
        progress: Math.max(0, progress),
        status: newStatus,
        anilistSyncStatus: existing.anilistMediaId ? "pending" : existing.anilistSyncStatus,
        anilistSyncError: existing.anilistMediaId ? null : existing.anilistSyncError,
        updatedAt: new Date(),
      })
      .where(and(eq(media.id, id), eq(media.userId, user.id)))
      .returning();

    if (updatedMedia.anilistMediaId) {
      await enqueueMediaSync(user.id, updatedMedia.id);
    }

    revalidatePath("/");

    return {
      success: true,
      data: updatedMedia as MediaItem,
    };
  } catch (error) {
    console.error("Error updating progress:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update progress",
    };
  }
}

// DELETE - Delete media
export async function deleteMedia(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();

    // First check if the media belongs to the user
    const [existing] = await db
      .select()
      .from(media)
      .where(and(eq(media.id, id), eq(media.userId, user.id)));

    if (!existing) {
      return {
        success: false,
        error: "Media not found or unauthorized",
      };
    }

    await db
      .delete(media)
      .where(and(eq(media.id, id), eq(media.userId, user.id)));

    if (existing.anilistListEntryId) {
      await sendInngestEvent({
        name: "anilist/media.delete.requested",
        data: {
          userId: user.id,
          mediaId: existing.id,
          anilistListEntryId: existing.anilistListEntryId,
        },
      });
    }

    revalidatePath("/");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting media:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete media",
    };
  }
}

async function enqueueMediaSync(userId: string, mediaId: string) {
  await sendInngestEvent({
    name: "anilist/media.sync.requested",
    data: { userId, mediaId },
  });
}

// DELETE ALL - Wipe the current user's entire list (for a fresh AniList import)
export async function deleteAllMedia(): Promise<{
  success: boolean;
  deleted?: number;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();

    const deleted = await db
      .delete(media)
      .where(eq(media.userId, user.id))
      .returning({ id: media.id });

    revalidatePath("/");

    return { success: true, deleted: deleted.length };
  } catch (error) {
    console.error("Error deleting all media:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clear list",
    };
  }
}
