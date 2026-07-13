import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  real,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth-schema";

/* ===========================
   ENUMS
=========================== */

// Media type
// NOTE: manhwa was merged into manga (manhwa is just manga of Korean origin on
// AniList too). The old "manhwa" value is removed from both the TS type and the
// Postgres enum; migration 0003 converts existing rows + recreates the enum.
export const mediaTypeEnum = pgEnum("media_type", ["anime", "manga"]);

// Watch / Read status
export const mediaStatusEnum = pgEnum("media_status", [
  "watching",
  "rewatching",
  "completed",
  "paused",
  "dropped",
  "plan",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "idle",
  "pending",
  "syncing",
  "synced",
  "failed",
]);

export const importJobStatusEnum = pgEnum("import_job_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);

export const importJobSourceEnum = pgEnum("import_job_source", [
  "connected",
  "public",
]);

/* ===========================
   MEDIA TABLE
=========================== */

export const media = pgTable("media", {
  id: uuid("id").defaultRandom().primaryKey(),

  title: varchar("title", { length: 255 }).notNull(),

  type: mediaTypeEnum("type").notNull(),

  status: mediaStatusEnum("status").default("plan").notNull(),

  coverImage: text("cover_image"), // image URL

  progress: integer("progress").default(0).notNull(), // watched/read count

  total: integer("total"), // total episodes / chapters (nullable)

  notes: text("notes"), // optional personal notes

  rating: real("rating"), // user score 0.0–10.0 (matches AniList POINT_10 format)

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // AniList integration — nullable, only set when the entry came from / is
  // synced with AniList. Used to dedupe on import and to mirror writes.
  anilistMediaId: integer("anilist_media_id"),
  anilistListEntryId: integer("anilist_list_entry_id"),
  anilistSyncStatus: syncStatusEnum("anilist_sync_status")
    .default("idle")
    .notNull(),
  anilistSyncError: text("anilist_sync_error"),
  anilistSyncedAt: timestamp("anilist_synced_at", { withTimezone: true }),
  // AniList's own updatedAt for this list entry (Unix seconds → stored as timestamp).
  // Used to replicate AniList's "Last Updated" sort order.
  anilistUpdatedAt: timestamp("anilist_updated_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  index("media_userId_idx").on(table.userId),
  // One local entry per AniList media per user (prevents duplicate imports/sync).
  // Postgres treats NULLs as distinct in unique indexes, so rows without an
  // anilistMediaId are not constrained.
  uniqueIndex("media_userId_anilistMediaId_idx").on(
    table.userId,
    table.anilistMediaId,
  ),
  index("media_userId_type_status_updatedAt_idx").on(
    table.userId,
    table.type,
    table.status,
    table.updatedAt,
  ),
]);

export const anilistImportJob = pgTable(
  "anilist_import_job",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: importJobSourceEnum("source").notNull(),
    status: importJobStatusEnum("status").default("queued").notNull(),
    username: text("username"),
    anilistUserId: integer("anilist_user_id"),
    imported: integer("imported").default(0).notNull(),
    updated: integer("updated").default(0).notNull(),
    errors: text("errors"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("anilist_import_job_userId_createdAt_idx").on(
      table.userId,
      table.createdAt,
    ),
    index("anilist_import_job_status_idx").on(table.status),
  ],
);

/* ===========================
   ANILIST ACCOUNT TABLE
=========================== */
// Stores the per-user AniList OAuth connection. AniList tokens are long-lived
// JWTs (no refresh token, no profile/email), so this is a linked account rather
// than a login method. One row per app user.
export const anilistAccount = pgTable(
  "anilist_account",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // The AniList user id + username captured at connect time
    anilistUserId: integer("anilist_user_id").notNull(),
    anilistUsername: text("anilist_username").notNull(),

    // Long-lived access token (JWT). Stored as plaintext — protected by DB
    // access controls. AniList does not issue refresh tokens.
    accessToken: text("access_token").notNull(),

    scope: text("scope"),

    connectedAt: timestamp("connected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("anilist_account_userId_idx").on(table.userId),
    index("anilist_account_anilistUserId_idx").on(table.anilistUserId),
  ],
);

/* ===========================
   RELATIONS
=========================== */

export const mediaRelations = relations(media, ({ one }) => ({
  user: one(user, {
    fields: [media.userId],
    references: [user.id],
  }),
}));

export const anilistAccountRelations = relations(anilistAccount, ({ one }) => ({
  user: one(user, {
    fields: [anilistAccount.userId],
    references: [user.id],
  }),
}));

export const anilistImportJobRelations = relations(anilistImportJob, ({ one }) => ({
  user: one(user, {
    fields: [anilistImportJob.userId],
    references: [user.id],
  }),
}));
