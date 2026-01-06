"use server";

import { db } from "@/lib/db";
import { media } from "@/schema/media-schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Types
export type MediaType = "anime" | "manga" | "manhwa";
export type MediaStatus = "watching" | "completed" | "plan";

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  status: MediaStatus;
  coverImage: string | null;
  progress: number;
  total: number | null;
  notes: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMediaInput {
  title: string;
  type: MediaType;
  status?: MediaStatus;
  coverImage?: string | null;
  progress?: number;
  total?: number | null;
  notes?: string | null;
}

export interface UpdateMediaInput {
  id: string;
  title?: string;
  type?: MediaType;
  status?: MediaStatus;
  coverImage?: string | null;
  progress?: number;
  total?: number | null;
  notes?: string | null;
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

// CREATE - Add new media
export async function createMedia(input: CreateMediaInput): Promise<{ success: boolean; data?: MediaItem; error?: string }> {
  try {
    const user = await getCurrentUser();

    const [newMedia] = await db
      .insert(media)
      .values({
        title: input.title,
        type: input.type,
        status: input.status || "plan",
        coverImage: input.coverImage || null,
        progress: input.progress || 0,
        total: input.total || null,
        notes: input.notes || null,
        userId: user.id,
      })
      .returning();

    revalidatePath("/");

    return {
      success: true,
      data: newMedia as MediaItem,
    };
  } catch (error) {
    console.error("Error creating media:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create media",
    };
  }
}

// READ - Get all media for current user
export async function getMedia(type?: MediaType): Promise<{ success: boolean; data?: MediaItem[]; error?: string }> {
  try {
    const user = await getCurrentUser();

    const conditions = type
      ? and(eq(media.userId, user.id), eq(media.type, type))
      : eq(media.userId, user.id);

    const userMedia = await db
      .select()
      .from(media)
      .where(conditions)
      .orderBy(desc(media.createdAt));

    return {
      success: true,
      data: userMedia as MediaItem[],
    };
  } catch (error) {
    console.error("Error fetching media:", error);
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

    const updateData: Partial<typeof media.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.coverImage !== undefined) updateData.coverImage = input.coverImage;
    if (input.progress !== undefined) updateData.progress = input.progress;
    if (input.total !== undefined) updateData.total = input.total;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const [updatedMedia] = await db
      .update(media)
      .set(updateData)
      .where(and(eq(media.id, input.id), eq(media.userId, user.id)))
      .returning();

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
    } else if (progress > 0) {
      newStatus = "watching";
    }

    const [updatedMedia] = await db
      .update(media)
      .set({
        progress: Math.max(0, progress),
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(media.id, id), eq(media.userId, user.id)))
      .returning();

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
