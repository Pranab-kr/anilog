-- Decouple column from old enum so we can rewrite values
ALTER TABLE "media" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
-- Merge: any existing manhwa rows become manga
UPDATE "media" SET "type" = 'manga' WHERE "type" = 'manhwa';--> statement-breakpoint
DROP TYPE "public"."media_type";--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('anime', 'manga');--> statement-breakpoint
ALTER TABLE "media" ALTER COLUMN "type" SET DATA TYPE "public"."media_type" USING "type"::"public"."media_type";