ALTER TABLE "store"
	ADD COLUMN IF NOT EXISTS "store_markup_percent" numeric(8, 2) NOT NULL DEFAULT '0';
