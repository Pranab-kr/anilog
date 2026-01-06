CREATE TYPE "public"."media_status" AS ENUM('watching', 'completed', 'plan');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('anime', 'manga', 'manhwa');--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"type" "media_type" NOT NULL,
	"status" "media_status" DEFAULT 'plan' NOT NULL,
	"cover_image" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"total" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
