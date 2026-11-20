CREATE TABLE "export_invoices" (
	"id" serial PRIMARY KEY,
	"number" text NOT NULL UNIQUE,
	"offer_id" integer NOT NULL,
	"date" date NOT NULL,
	"due_date" date NOT NULL,
	"total" numeric(12,2) NOT NULL,
	"currency" text NOT NULL,
	"rate" numeric(14,6) NOT NULL,
	"status" text DEFAULT 'izdan' NOT NULL,
	"paid_at" date,
	"employee_id" integer,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_offer_items" (
	"id" serial PRIMARY KEY,
	"offer_id" integer NOT NULL,
	"product_id" integer,
	"code" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"qty" integer NOT NULL,
	"unit" text DEFAULT 'kom' NOT NULL,
	"unit_price" numeric(12,2) NOT NULL,
	"discount_pct" numeric(12,2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_offers" (
	"id" serial PRIMARY KEY,
	"number" text NOT NULL UNIQUE,
	"date" date NOT NULL,
	"valid_until" date NOT NULL,
	"status" text DEFAULT 'nacrt' NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_address" text DEFAULT '' NOT NULL,
	"buyer_city" text DEFAULT '' NOT NULL,
	"buyer_country" text DEFAULT '' NOT NULL,
	"buyer_vat_id" text DEFAULT '' NOT NULL,
	"buyer_contact" text DEFAULT '' NOT NULL,
	"buyer_email" text DEFAULT '' NOT NULL,
	"buyer_phone" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"rate" numeric(14,6) DEFAULT '1.95583' NOT NULL,
	"incoterms" text DEFAULT '' NOT NULL,
	"payment_days" integer DEFAULT 0 NOT NULL,
	"payment_terms" text DEFAULT '' NOT NULL,
	"delivery_terms" text DEFAULT '' NOT NULL,
	"location" text DEFAULT 'skladiste' NOT NULL,
	"vat_note" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"employee_id" integer,
	"created_at" timestamp NOT NULL,
	"decided_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "export_invoice_id" integer;--> statement-breakpoint
CREATE INDEX "export_invoices_date_idx" ON "export_invoices" ("date");--> statement-breakpoint
CREATE INDEX "export_offers_date_idx" ON "export_offers" ("date");--> statement-breakpoint
ALTER TABLE "export_invoices" ADD CONSTRAINT "export_invoices_offer_id_export_offers_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "export_offers"("id");--> statement-breakpoint
ALTER TABLE "export_invoices" ADD CONSTRAINT "export_invoices_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "export_offer_items" ADD CONSTRAINT "export_offer_items_offer_id_export_offers_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "export_offers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "export_offer_items" ADD CONSTRAINT "export_offer_items_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "export_offers" ADD CONSTRAINT "export_offers_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_export_invoice_id_export_invoices_id_fkey" FOREIGN KEY ("export_invoice_id") REFERENCES "export_invoices"("id") ON DELETE CASCADE;