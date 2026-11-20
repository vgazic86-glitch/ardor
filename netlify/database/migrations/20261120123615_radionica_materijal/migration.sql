CREATE TABLE "material_moves" (
	"id" serial PRIMARY KEY,
	"material_id" integer NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"qty" numeric(12,3) NOT NULL,
	"unit_cost" numeric(12,4) DEFAULT '0' NOT NULL,
	"supplier_id" integer,
	"document_number" text DEFAULT '' NOT NULL,
	"work_cost_id" integer,
	"note" text DEFAULT '' NOT NULL,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY,
	"code" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"unit" text DEFAULT 'kom' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"supplier_id" integer,
	"price" numeric(12,2) DEFAULT '0' NOT NULL,
	"min_qty" numeric(12,3) DEFAULT '0' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "material_moves_material_idx" ON "material_moves" ("material_id");--> statement-breakpoint
ALTER TABLE "material_moves" ADD CONSTRAINT "material_moves_material_id_materials_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id");--> statement-breakpoint
ALTER TABLE "material_moves" ADD CONSTRAINT "material_moves_supplier_id_suppliers_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "material_moves" ADD CONSTRAINT "material_moves_work_cost_id_work_order_costs_id_fkey" FOREIGN KEY ("work_cost_id") REFERENCES "work_order_costs"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_supplier_id_suppliers_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL;