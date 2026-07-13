CREATE TYPE "public"."import_job_source" AS ENUM('connected', 'public');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('queued', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('idle', 'pending', 'syncing', 'synced', 'failed');--> statement-breakpoint
CREATE TABLE "anilist_import_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"source" "import_job_source" NOT NULL,
	"status" "import_job_status" DEFAULT 'queued' NOT NULL,
	"username" text,
	"anilist_user_id" integer,
	"imported" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"errors" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "anilist_sync_status" "sync_status" DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "anilist_sync_error" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "anilist_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "anilist_import_job" ADD CONSTRAINT "anilist_import_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anilist_import_job_userId_createdAt_idx" ON "anilist_import_job" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "anilist_import_job_status_idx" ON "anilist_import_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "media_userId_type_status_updatedAt_idx" ON "media" USING btree ("user_id","type","status","updated_at");