ALTER TABLE "item_master"
	ADD COLUMN IF NOT EXISTS "item_markup_percent" numeric(8, 2) NOT NULL DEFAULT '0';
