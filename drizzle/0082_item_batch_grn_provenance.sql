-- Link item_batch to source GRN line/note for sale-time pricing formula inputs.

ALTER TABLE "item_batch"
	ADD COLUMN IF NOT EXISTS "goods_receipt_note_id" uuid REFERENCES "goods_receipt_note"("id") ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS "goods_receipt_line_id" integer REFERENCES "goods_receipt_line"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "item_batch_grn_line_idx"
	ON "item_batch" ("goods_receipt_line_id");

CREATE INDEX IF NOT EXISTS "item_batch_grn_note_idx"
	ON "item_batch" ("goods_receipt_note_id");

-- Backfill from earliest GRN line per batch (first receipt wins).
UPDATE "item_batch" ib
SET
	"goods_receipt_line_id" = sub.line_id,
	"goods_receipt_note_id" = sub.grn_id
FROM (
	SELECT DISTINCT ON ("batch_id")
		"batch_id",
		"id" AS line_id,
		"grn_id"
	FROM "goods_receipt_line"
	WHERE "batch_id" IS NOT NULL
	ORDER BY "batch_id", "id" ASC
) sub
WHERE ib."id" = sub."batch_id"
	AND ib."goods_receipt_line_id" IS NULL;
