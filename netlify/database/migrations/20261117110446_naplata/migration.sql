CREATE TABLE "installments" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"seq" integer NOT NULL,
	"due_date" date NOT NULL,
	"amount" numeric(12,2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_reminders" (
	"id" serial PRIMARY KEY,
	"order_id" integer NOT NULL,
	"at" timestamp NOT NULL,
	"user_name" text DEFAULT '' NOT NULL,
	"channel" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "due_date" date;--> statement-breakpoint
CREATE INDEX "installments_order_idx" ON "installments" ("order_id");--> statement-breakpoint
CREATE INDEX "payment_reminders_order_idx" ON "payment_reminders" ("order_id");--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;