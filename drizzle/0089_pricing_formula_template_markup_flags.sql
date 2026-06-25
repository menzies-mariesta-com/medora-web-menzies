ALTER TABLE "inv_pricing_formula_template"
	ADD COLUMN IF NOT EXISTS "include_item_markup" boolean NOT NULL DEFAULT true;

ALTER TABLE "inv_pricing_formula_template"
	ADD COLUMN IF NOT EXISTS "include_store_markup" boolean NOT NULL DEFAULT true;
