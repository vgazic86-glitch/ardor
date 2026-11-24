CREATE TABLE "web_orders" (
	"id" serial PRIMARY KEY,
	"at" timestamp NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"delivery" text DEFAULT 'dostava' NOT NULL,
	"payment" text DEFAULT 'pouzece' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"lines" text DEFAULT '[]' NOT NULL,
	"total" numeric(12,2) NOT NULL,
	"ip" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'nova' NOT NULL,
	"handled_by" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"order_id" integer,
	"email_sent" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "web_orders" ADD CONSTRAINT "web_orders_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;