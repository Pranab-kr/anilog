CREATE TABLE "anilist_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"anilist_user_id" integer NOT NULL,
	"anilist_username" text NOT NULL,
	"access_token" text NOT NULL,
	"scope" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "anilist_media_id" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "anilist_list_entry_id" integer;--> statement-breakpoint
ALTER TABLE "anilist_account" ADD CONSTRAINT "anilist_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "anilist_account_userId_idx" ON "anilist_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "anilist_account_anilistUserId_idx" ON "anilist_account" USING btree ("anilist_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_userId_anilistMediaId_idx" ON "media" USING btree ("user_id","anilist_media_id");