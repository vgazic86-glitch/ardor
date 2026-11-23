CREATE TABLE "web_articles" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"theme" text DEFAULT '' NOT NULL,
	"room" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"image_id" integer,
	"status" text DEFAULT 'nacrt' NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"approved_by" text DEFAULT '' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "web_content" (
	"key" text PRIMARY KEY,
	"value" text DEFAULT '' NOT NULL,
	"updated_at" timestamp,
	"updated_by" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "web_articles" ADD CONSTRAINT "web_articles_image_id_files_id_fkey" FOREIGN KEY ("image_id") REFERENCES "files"("id") ON DELETE SET NULL;