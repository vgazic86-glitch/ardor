CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY,
	"at" timestamp NOT NULL,
	"user_id" integer,
	"user_name" text DEFAULT '' NOT NULL,
	"entity" text NOT NULL,
	"action" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"ip" text DEFAULT '' NOT NULL,
	"ok" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_at_idx" ON "audit_log" ("at");--> statement-breakpoint
CREATE INDEX "audit_subject_idx" ON "audit_log" ("subject","at");