CREATE TABLE "price_changes" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"old_price" numeric(12,2) NOT NULL,
	"new_price" numeric(12,2) NOT NULL,
	"at" timestamp NOT NULL,
	"user_name" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "price_changes_at_idx" ON "price_changes" ("at");--> statement-breakpoint
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE;