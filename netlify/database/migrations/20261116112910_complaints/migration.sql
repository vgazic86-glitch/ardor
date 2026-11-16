CREATE TABLE "complaint_photos" (
	"id" serial PRIMARY KEY,
	"complaint_id" integer NOT NULL,
	"image_id" integer NOT NULL,
	"thumb_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" serial PRIMARY KEY,
	"number" text NOT NULL UNIQUE,
	"date" date NOT NULL,
	"customer_id" integer,
	"order_id" integer,
	"product_id" integer,
	"supplier_id" integer,
	"kind" text DEFAULT 'ostecenje' NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'prijavljena' NOT NULL,
	"resolution" text DEFAULT '' NOT NULL,
	"resolution_note" text DEFAULT '' NOT NULL,
	"due_date" date,
	"assignee_id" integer,
	"created_by_id" integer,
	"created_by_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "complaint_photos_idx" ON "complaint_photos" ("complaint_id");--> statement-breakpoint
CREATE INDEX "complaints_status_idx" ON "complaints" ("status");--> statement-breakpoint
ALTER TABLE "complaint_photos" ADD CONSTRAINT "complaint_photos_complaint_id_complaints_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "complaint_photos" ADD CONSTRAINT "complaint_photos_image_id_files_id_fkey" FOREIGN KEY ("image_id") REFERENCES "files"("id");--> statement-breakpoint
ALTER TABLE "complaint_photos" ADD CONSTRAINT "complaint_photos_thumb_id_files_id_fkey" FOREIGN KEY ("thumb_id") REFERENCES "files"("id");--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_supplier_id_suppliers_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id");--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_assignee_id_users_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_created_by_id_users_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id");