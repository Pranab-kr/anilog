import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  boolean,
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
  "completed",
  "plan",
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

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // AniList integration — nullable, only set when the entry came from / is
  // synced with AniList. Used to dedupe on import and to mirror writes.
  anilistMediaId: integer("anilist_media_id"),
  anilistListEntryId: integer("anilist_list_entry_id"),

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
]);

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
