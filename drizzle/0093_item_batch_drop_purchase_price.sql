-- Price lives on goods_receipt_line only; batch identity no longer uses purchase_price.

UPDATE item_batch ib
SET
	goods_receipt_line_id = sub.line_id,
	goods_receipt_note_id = sub.grn_id
FROM (
	SELECT DISTINCT ON (batch_id)
		batch_id,
		id AS line_id,
		grn_id
	FROM goods_receipt_line
	WHERE batch_id IS NOT NULL
	ORDER BY batch_id, id ASC
) sub
WHERE ib.id = sub.batch_id
	AND ib.goods_receipt_line_id IS NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS item_batch_identity_legacy_uidx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS item_batch_identity_legacy_uidx ON item_batch (
	hospital_id,
	item_id,
	batch_no,
	expiry_date,
	supplier_id
) NULLS NOT DISTINCT
WHERE goods_receipt_line_id IS NULL;
--> statement-breakpoint
ALTER TABLE item_batch DROP COLUMN IF EXISTS purchase_price;
