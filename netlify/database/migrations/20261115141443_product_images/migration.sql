ALTER TABLE "products" ADD COLUMN "image_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "thumb_id" integer;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_image_id_files_id_fkey" FOREIGN KEY ("image_id") REFERENCES "files"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_thumb_id_files_id_fkey" FOREIGN KEY ("thumb_id") REFERENCES "files"("id") ON DELETE SET NULL;