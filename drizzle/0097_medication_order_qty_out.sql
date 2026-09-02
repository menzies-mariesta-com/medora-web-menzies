-- Drop pricing-assignment price unit; medication order lines use qty_out + out_unit_id.

ALTER TABLE "inv_module_pricing_assignment"
	DROP CONSTRAINT IF EXISTS "inv_module_pricing_assignment_price_unit_chk";

ALTER TABLE "inv_module_pricing_assignment"
	DROP COLUMN IF EXISTS "price_unit";

ALTER TABLE "medication_order_line"
	DROP CONSTRAINT IF EXISTS "medication_order_line_unit_sale_price_unit_chk";

ALTER TABLE "medication_order_line"
	DROP COLUMN IF EXISTS "unit_sale_price_unit";

ALTER TABLE "medication_order_line"
	ADD COLUMN IF NOT EXISTS "out_unit_id" integer;

DO $$ BEGIN
	ALTER TABLE "medication_order_line"
		ADD CONSTRAINT "medication_order_line_out_unit_id_unit_id_fk"
		FOREIGN KEY ("out_unit_id") REFERENCES "public"."unit"("id")
		ON DELETE restrict ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

UPDATE "medication_order_line" mol
SET "out_unit_id" = ium."purchase_unit_id"
FROM "item_unit_master" ium
WHERE mol."item_unit_master_id" = ium."id"
	AND mol."out_unit_id" IS NULL;

ALTER TABLE "medication_order_line"
	RENAME COLUMN "issue_qty_purchase" TO "qty_out";
