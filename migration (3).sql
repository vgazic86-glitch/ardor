CREATE TABLE "purchase_order_items" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"product_id" integer,
	"code" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"qty" integer NOT NULL,
	"unit" text DEFAULT 'kom' NOT NULL,
	"price" numeric(12,2),
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY,
	"number" text NOT NULL UNIQUE,
	"date" date NOT NULL,
	"supplier_id" integer NOT NULL,
	"status" text DEFAULT 'nacrt' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"delivery_by" date,
	"created_by" integer,
	"created_by_name" text DEFAULT '' NOT NULL,
	"closed_at" timestamp,
	"receipt_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_ledger" (
	"id" serial PRIMARY KEY,
	"supplier_id" integer NOT NULL,
	"date" date NOT NULL,
	"kind" text NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"document" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by_name" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_time" (
	"id" serial PRIMARY KEY,
	"employee_id" integer NOT NULL,
	"date" date NOT NULL,
	"kind" text DEFAULT 'rad' NOT NULL,
	"start" text DEFAULT '' NOT NULL,
	"end" text DEFAULT '' NOT NULL,
	"break_min" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"updated_by_name" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "purchase_order_items_order_idx" ON "purchase_order_items" ("order_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_supplier_idx" ON "purchase_orders" ("supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_ledger_supplier_idx" ON "supplier_ledger" ("supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_time_employee_date_idx" ON "work_time" ("employee_id","date");--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_purchase_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id");--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_receipt_id_receipts_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "supplier_ledger" ADD CONSTRAINT "supplier_ledger_supplier_id_suppliers_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id");--> statement-breakpoint
ALTER TABLE "work_time" ADD CONSTRAINT "work_time_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");