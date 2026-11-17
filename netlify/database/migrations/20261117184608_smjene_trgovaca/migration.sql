CREATE TABLE "shifts" (
	"id" serial PRIMARY KEY,
	"date" date NOT NULL,
	"user_id" integer NOT NULL,
	"shift" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shifts_day_user_uq" ON "shifts" ("date","user_id");--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;