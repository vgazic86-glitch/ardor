CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"assignee_id" integer NOT NULL,
	"created_by_id" integer,
	"created_by_name" text DEFAULT '' NOT NULL,
	"due_date" date,
	"priority" text DEFAULT 'normalno' NOT NULL,
	"status" text DEFAULT 'otvoren' NOT NULL,
	"done_note" text DEFAULT '' NOT NULL,
	"done_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "tasks_assignee_idx" ON "tasks" ("assignee_id","status");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_users_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id");