-- One cost lot per goods_receipt_line: same physical batch + different GRN terms → separate item_batch rows.
DROP INDEX IF EXISTS item_batch_identity_uidx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS item_batch_identity_uidx ON item_batch (
	hospital_id,
	item_id,
	batch_no,
	expiry_date,
	supplier_id,
	purchase_price,
	goods_receipt_line_id
) NULLS NOT DISTINCT;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS item_batch_grn_line_uidx ON item_batch (goods_receipt_line_id)
WHERE goods_receipt_line_id IS NOT NULL;
