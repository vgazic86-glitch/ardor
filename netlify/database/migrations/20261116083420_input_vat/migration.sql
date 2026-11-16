ALTER TABLE "receipts" ADD COLUMN "vat" numeric(12,2);--> statement-breakpoint
ALTER TABLE "supplier_ledger" ADD COLUMN "vat" numeric(12,2) DEFAULT '0' NOT NULL;