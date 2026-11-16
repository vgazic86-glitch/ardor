CREATE TABLE "employee_targets" (
	"id" serial PRIMARY KEY,
	"employee_id" integer NOT NULL,
	"month" text NOT NULL,
	"target" numeric(12,2) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "employee_targets_employee_month_idx" ON "employee_targets" ("employee_id","month");--> statement-breakpoint
ALTER TABLE "employee_targets" ADD CONSTRAINT "employee_targets_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");