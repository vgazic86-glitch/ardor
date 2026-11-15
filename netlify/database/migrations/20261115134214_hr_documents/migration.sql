CREATE TABLE "bonuses" (
	"id" serial PRIMARY KEY,
	"employee_id" integer NOT NULL,
	"month" text NOT NULL,
	"fixed_gross" numeric(12,2) DEFAULT '0' NOT NULL,
	"proposed" numeric(12,2) DEFAULT '0' NOT NULL,
	"approved" numeric(12,2),
	"status" text DEFAULT 'prijedlog' NOT NULL,
	"basis" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"decided_by" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"file_id" integer,
	"version" text DEFAULT '1.0' NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_files" (
	"id" serial PRIMARY KEY,
	"employee_id" integer NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"valid_from" date,
	"valid_until" date,
	"note" text DEFAULT '' NOT NULL,
	"file_id" integer,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"mime" text DEFAULT 'application/octet-stream' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"data" bytea NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salaries" (
	"id" serial PRIMARY KEY,
	"employee_id" integer NOT NULL,
	"valid_from" date NOT NULL,
	"gross" numeric(12,2) NOT NULL,
	"net" numeric(12,2) NOT NULL,
	"meal" numeric(12,2) DEFAULT '0' NOT NULL,
	"transport" numeric(12,2) DEFAULT '0' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bonuses_employee_month_idx" ON "bonuses" ("employee_id","month");--> statement-breakpoint
CREATE INDEX "employee_files_employee_idx" ON "employee_files" ("employee_id");--> statement-breakpoint
CREATE INDEX "salaries_employee_idx" ON "salaries" ("employee_id");--> statement-breakpoint
ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");--> statement-breakpoint
ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_decided_by_employees_id_fkey" FOREIGN KEY ("decided_by") REFERENCES "employees"("id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_file_id_files_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_updated_by_employees_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "employees"("id");--> statement-breakpoint
ALTER TABLE "employee_files" ADD CONSTRAINT "employee_files_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");--> statement-breakpoint
ALTER TABLE "employee_files" ADD CONSTRAINT "employee_files_file_id_files_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "employee_files" ADD CONSTRAINT "employee_files_uploaded_by_employees_id_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "employees"("id");--> statement-breakpoint
ALTER TABLE "salaries" ADD CONSTRAINT "salaries_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");