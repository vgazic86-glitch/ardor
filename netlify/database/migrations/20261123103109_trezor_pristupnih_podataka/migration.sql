CREATE TABLE "vault_entries" (
	"id" serial PRIMARY KEY,
	"kind" text DEFAULT 'email' NOT NULL,
	"title" text NOT NULL,
	"username" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"secret_enc" text DEFAULT '' NOT NULL,
	"note_enc" text DEFAULT '' NOT NULL,
	"updated_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
