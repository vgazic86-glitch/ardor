CREATE TABLE "transfers" (
	"id" serial PRIMARY KEY,
	"number" text NOT NULL UNIQUE,
	"date" date NOT NULL,
	"from_location" text NOT NULL,
	"to_location" text NOT NULL,
	"employee_id" integer,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "location" text DEFAULT 'salon' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "transfer_id" integer;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_transfer_id_transfers_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "transfers"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");