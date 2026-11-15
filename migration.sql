CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"username" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"role" text DEFAULT 'uprava' NOT NULL,
	"employee_id" integer,
	"hr_access" boolean DEFAULT false NOT NULL,
	"password_hash" text,
	"activation_code" text,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id");