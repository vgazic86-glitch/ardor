ALTER TABLE "order_items" ADD COLUMN "variant" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "options" text DEFAULT '' NOT NULL;