ALTER TYPE "public"."media_status" ADD VALUE 'rewatching' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."media_status" ADD VALUE 'paused' BEFORE 'plan';--> statement-breakpoint
ALTER TYPE "public"."media_status" ADD VALUE 'dropped' BEFORE 'plan';