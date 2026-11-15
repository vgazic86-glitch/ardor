CREATE TABLE "app_meta" (
	"key" text PRIMARY KEY,
	"value" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL UNIQUE,
	"date" date NOT NULL,
	"slot" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"driver_id" integer NOT NULL,
	"assembly" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'zakazana' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"initials" text NOT NULL,
	"color" text DEFAULT '#7c4a2d' NOT NULL,
	"monthly_target" numeric(12,2) DEFAULT '0' NOT NULL,
	"commission_rate" numeric(6,4) DEFAULT '0' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"qty" integer NOT NULL,
	"unit_price" numeric(12,2) NOT NULL,
	"discount_pct" numeric(5,2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"number" text NOT NULL UNIQUE,
	"date" date NOT NULL,
	"customer_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"status" text NOT NULL,
	"payment_method" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"issued_at" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"method" text NOT NULL,
	"employee_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY,
	"sku" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"price" numeric(12,2) NOT NULL,
	"purchase_price" numeric(12,2) DEFAULT '0' NOT NULL,
	"min_stock" integer DEFAULT 0 NOT NULL,
	"supplier_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" serial PRIMARY KEY,
	"number" text NOT NULL UNIQUE,
	"date" date NOT NULL,
	"supplier_id" integer,
	"document_number" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"employee_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY,
	"product_id" integer NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_cost" numeric(12,2) DEFAULT '0' NOT NULL,
	"receipt_id" integer,
	"order_id" integer,
	"employee_id" integer,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"lead_time_days" integer DEFAULT 14 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" ("order_id");--> statement-breakpoint
CREATE INDEX "orders_date_idx" ON "orders" ("date");--> statement-breakpoint
CREATE INDEX "orders_employee_idx" ON "orders" ("employee_id");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" ("order_id");--> statement-breakpoint
CREATE INDEX "stock_movements_product_idx" ON "stock_movements" ("product_id");--> statement-breakpoint
CREATE INDEX "stock_movements_order_idx" ON "stock_movements" ("order_id");--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_driver_id_employees_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "employees"("id");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_supplier_id_suppliers_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_receipt_id_receipts_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");