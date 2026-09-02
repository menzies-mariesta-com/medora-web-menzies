-- Per assignment: which unit IS/ES sale price uses after formula + IUM conversion.

ALTER TABLE "inv_module_pricing_assignment"
	ADD COLUMN IF NOT EXISTS "price_unit" varchar(16) NOT NULL DEFAULT 'PURCHASE';

UPDATE "inv_module_pricing_assignment"
SET "price_unit" = 'ISSUE'
WHERE "module" = 'DC';

ALTER TABLE "inv_module_pricing_assignment"
	DROP CONSTRAINT IF EXISTS "inv_module_pricing_assignment_price_unit_chk";

ALTER TABLE "inv_module_pricing_assignment"
	ADD CONSTRAINT "inv_module_pricing_assignment_price_unit_chk"
	CHECK ("price_unit" IN ('PURCHASE', 'ISSUE'));

ALTER TABLE "medication_order_line"
	ADD COLUMN IF NOT EXISTS "unit_sale_price_unit" varchar(16) NOT NULL DEFAULT 'PURCHASE';

ALTER TABLE "medication_order_line"
	DROP CONSTRAINT IF EXISTS "medication_order_line_unit_sale_price_unit_chk";

ALTER TABLE "medication_order_line"
	ADD CONSTRAINT "medication_order_line_unit_sale_price_unit_chk"
	CHECK ("unit_sale_price_unit" IN ('PURCHASE', 'ISSUE'));
