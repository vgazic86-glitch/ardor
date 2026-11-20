CREATE TABLE "work_orders" (
	"id" serial PRIMARY KEY,
	"number" text NOT NULL UNIQUE,
	"order_id" integer NOT NULL,
	"order_item_id" integer NOT NULL UNIQUE,
	"status" text DEFAULT 'novi' NOT NULL,
	"due_date" date,
	"note" text DEFAULT '' NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"done_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "custom_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "image_id" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "thumb_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "made_to_order" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "work_orders_order_idx" ON "work_orders" ("order_id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_image_id_files_id_fkey" FOREIGN KEY ("image_id") REFERENCES "files"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_thumb_id_files_id_fkey" FOREIGN KEY ("thumb_id") REFERENCES "files"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_order_item_id_order_items_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE;