"use server";

import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendInngestEvent } from "@/lib/inngest/client";
import { anilistAccount, anilistImportJob } from "@/schema/media-schema";
import { normalizeAniListUsername } from "@/lib/anilist/importer";

async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

export interface ImportJob {
  id: string;
  source: "connected" | "public";
  status: "queued" | "running" | "completed" | "failed";
  username: string | null;
  anilistUserId: number | null;
  imported: number;
  updated: number;
  errors: string | null;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
}

export interface QueuedImport {
  jobId: string;
  job: ImportJob;
}

export async function importPublicAniListList(
  username: string,
): Promise<{
  success: boolean;
  data?: QueuedImport;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    const normalizedUsername = normalizeAniListUsername(username);

    if (!normalizedUsername) {
      return { success: false, error: "AniList username is required" };
    }

    const [job] = await db
      .insert(anilistImportJob)
      .values({
        userId: user.id,
        source: "public",
        username: normalizedUsername,
      })
      .returning();

    await enqueueImportJob(user.id, job.id);

    return {
      success: true,
      data: { jobId: job.id, job: job as ImportJob },
    };
  } catch (error) {
    console.error("Import enqueue error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to queue AniList import",
    };
  }
}

export async function syncFromAniList(): Promise<{
  success: boolean;
  data?: QueuedImport;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();

    const [acct] = await db
      .select()
      .from(anilistAccount)
      .where(eq(anilistAccount.userId, user.id));

    if (!acct) {
      return { success: false, error: "AniList is not connected" };
    }

    const [job] = await db
      .insert(anilistImportJob)
      .values({
        userId: user.id,
        source: "connected",
        username: acct.anilistUsername,
        anilistUserId: acct.anilistUserId,
      })
      .returning();

    await enqueueImportJob(user.id, job.id);

    return {
      success: true,
      data: { jobId: job.id, job: job as ImportJob },
    };
  } catch (error) {
    console.error("Sync enqueue error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to queue AniList sync",
    };
  }
}

export async function getAniListImportJob(
  jobId: string,
): Promise<{ success: boolean; data?: ImportJob; error?: string }> {
  try {
    const user = await getCurrentUser();
    const [job] = await db
      .select()
      .from(anilistImportJob)
      .where(and(eq(anilistImportJob.id, jobId), eq(anilistImportJob.userId, user.id)));

    if (!job) {
      return { success: false, error: "Import job not found" };
    }

    return { success: true, data: job as ImportJob };
  } catch (error) {
    console.error("Import job lookup error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to load import job",
    };
  }
}

export async function getLatestAniListImportJob(): Promise<{
  success: boolean;
  data?: ImportJob | null;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    const [job] = await db
      .select()
      .from(anilistImportJob)
      .where(eq(anilistImportJob.userId, user.id))
      .orderBy(desc(anilistImportJob.createdAt))
      .limit(1);

    return { success: true, data: (job as ImportJob | undefined) ?? null };
  } catch (error) {
    console.error("Latest import job lookup error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to load import job",
    };
  }
}

async function enqueueImportJob(userId: string, jobId: string) {
  await sendInngestEvent({
    name: "anilist/import.requested",
    data: { userId, jobId },
  });
}
