CREATE TABLE "product_categories" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);
--> statement-breakpoint
INSERT INTO "product_categories" ("name") SELECT DISTINCT "category" FROM "products" WHERE "category" <> '' ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "product_categories" ("name") VALUES ('Sjedeće garniture'), ('Kuhinje'), ('Spavaće sobe'), ('Blagovaonice'), ('Uredski namještaj'), ('Dekor i rasvjeta'), ('Ostalo') ON CONFLICT ("name") DO NOTHING;
