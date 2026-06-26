-- Batch identity for GRN-linked lots: physical batch + goods_receipt_line (not purchase_price).
-- Legacy rows without GRN line keep supplier + purchase_price identity.

DROP INDEX IF EXISTS item_batch_identity_uidx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS item_batch_identity_grn_uidx ON item_batch (
	hospital_id,
	item_id,
	batch_no,
	expiry_date,
	goods_receipt_line_id
) NULLS NOT DISTINCT
WHERE goods_receipt_line_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS item_batch_identity_legacy_uidx ON item_batch (
	hospital_id,
	item_id,
	batch_no,
	expiry_date,
	supplier_id,
	purchase_price
) NULLS NOT DISTINCT
WHERE goods_receipt_line_id IS NULL;
