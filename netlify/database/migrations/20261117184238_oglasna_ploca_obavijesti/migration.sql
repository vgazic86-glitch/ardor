CREATE TABLE "announcement_reads" (
	"announcement_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"read_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"author_id" integer,
	"author_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"at" timestamp NOT NULL,
	"title" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "announcement_reads_uq" ON "announcement_reads" ("announcement_id","user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" ("user_id","at");--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_announcements_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;