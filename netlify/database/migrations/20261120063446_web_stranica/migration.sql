CREATE TABLE "web_inquiries" (
	"id" serial PRIMARY KEY,
	"at" timestamp NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"room" text DEFAULT '' NOT NULL,
	"dimensions" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"product" text DEFAULT '' NOT NULL,
	"advice" text DEFAULT '' NOT NULL,
	"date" date,
	"slot" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"ip" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'novo' NOT NULL,
	"handled_by" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"customer_id" integer
);
--> statement-breakpoint
CREATE TABLE "web_inquiry_photos" (
	"id" serial PRIMARY KEY,
	"inquiry_id" integer NOT NULL,
	"file_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_products" (
	"product_id" integer PRIMARY KEY,
	"visible" boolean DEFAULT false NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"room" text DEFAULT 'dnevni-boravak' NOT NULL,
	"style" text DEFAULT 'moderni' NOT NULL,
	"color" text DEFAULT 'svijetla' NOT NULL,
	"material" text DEFAULT 'tkanina' NOT NULL,
	"type_label" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"dimensions" text DEFAULT '' NOT NULL,
	"materials" text DEFAULT '' NOT NULL,
	"personal" text DEFAULT '' NOT NULL,
	"swatches" text DEFAULT '' NOT NULL,
	"old_price" numeric(12,2),
	"featured" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "web_inquiries_at_idx" ON "web_inquiries" ("at");--> statement-breakpoint
CREATE INDEX "web_inquiry_photos_idx" ON "web_inquiry_photos" ("inquiry_id");--> statement-breakpoint
ALTER TABLE "web_inquiries" ADD CONSTRAINT "web_inquiries_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "web_inquiry_photos" ADD CONSTRAINT "web_inquiry_photos_inquiry_id_web_inquiries_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "web_inquiries"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "web_inquiry_photos" ADD CONSTRAINT "web_inquiry_photos_file_id_files_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id");--> statement-breakpoint
ALTER TABLE "web_products" ADD CONSTRAINT "web_products_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;