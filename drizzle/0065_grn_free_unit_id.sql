-- Add a unit reference for free quantity on GRN lines.
ALTER TABLE "goods_receipt_line"
ADD COLUMN IF NOT EXISTS "free_unit_id" integer;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'goods_receipt_line_free_unit_id_fkey'
	) THEN
		ALTER TABLE "goods_receipt_line"
		ADD CONSTRAINT "goods_receipt_line_free_unit_id_fkey"
		FOREIGN KEY ("free_unit_id") REFERENCES "unit" ("id") ON DELETE RESTRICT;
	END IF;
END $$;

-- Backfill existing rows to match the line's purchase unit.
UPDATE "goods_receipt_line"
SET "free_unit_id" = "unit_id"
WHERE "free_unit_id" IS NULL;

