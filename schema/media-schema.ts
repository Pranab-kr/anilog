import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth-schema";

/* ===========================
   ENUMS
=========================== */

// Media type
export const mediaTypeEnum = pgEnum("media_type", [
  "anime",
  "manga",
  "manhwa",
]);

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

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [index("media_userId_idx").on(table.userId)]);

/* ===========================
   RELATIONS
=========================== */

export const mediaRelations = relations(media, ({ one }) => ({
  user: one(user, {
    fields: [media.userId],
    references: [user.id],
  }),
}));
