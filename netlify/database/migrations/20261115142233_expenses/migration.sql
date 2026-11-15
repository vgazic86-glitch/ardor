CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY,
	"date" date NOT NULL,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"supplier" text DEFAULT '' NOT NULL,
	"document_number" text DEFAULT '' NOT NULL,
	"net" numeric(12,2) NOT NULL,
	"vat" numeric(12,2) DEFAULT '0' NOT NULL,
	"payment_method" text DEFAULT 'Virman' NOT NULL,
	"recurring" boolean DEFAULT false NOT NULL,
	"file_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" ("date");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_file_id_files_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_employees_id_fkey" FOREIGN KEY ("created_by") REFERENCES "employees"("id");