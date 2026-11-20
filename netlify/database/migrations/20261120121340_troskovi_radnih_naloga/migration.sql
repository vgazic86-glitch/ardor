CREATE TABLE "work_order_costs" (
	"id" serial PRIMARY KEY,
	"work_order_id" integer NOT NULL,
	"kind" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"supplier_id" integer,
	"document_number" text DEFAULT '' NOT NULL,
	"qty" numeric(10,2) DEFAULT '1' NOT NULL,
	"unit_price" numeric(12,2) DEFAULT '0' NOT NULL,
	"amount" numeric(12,2) NOT NULL,
	"date" date NOT NULL,
	"employee_id" integer,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "work_order_costs_wo_idx" ON "work_order_costs" ("work_order_id");--> statement-breakpoint
ALTER TABLE "work_order_costs" ADD CONSTRAINT "work_order_costs_work_order_id_work_orders_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "work_order_costs" ADD CONSTRAINT "work_order_costs_supplier_id_suppliers_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "work_order_costs" ADD CONSTRAINT "work_order_costs_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL;