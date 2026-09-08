-- Item Master: free-text manufacturer_name; remove manufacturer_id / manufacture-setup nav.
-- Drops manufacturer_id from purchase_order_line and item_batch; merges duplicate batches if needed;
-- drops manufacturer master table.

--> statement-breakpoint
DELETE FROM user_group_page WHERE page_id IN (
	SELECT id FROM page WHERE page_url = '/medora/home/inventory-setup/manufacture-setup'
);
--> statement-breakpoint
DELETE FROM page WHERE page_url = '/medora/home/inventory-setup/manufacture-setup';
--> statement-breakpoint
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS manufacturer_name varchar(512);
--> statement-breakpoint
UPDATE item_master im
SET manufacturer_name = m.name
FROM manufacturer m
WHERE im.manufacturer_id = m.id AND (im.manufacturer_name IS NULL OR btrim(im.manufacturer_name) = '');
--> statement-breakpoint
DROP INDEX IF EXISTS item_batch_identity_uidx;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS _migration_batch_merge_0073 (
	loser_id integer PRIMARY KEY,
	keeper_id integer NOT NULL
);
--> statement-breakpoint
TRUNCATE TABLE _migration_batch_merge_0073;
--> statement-breakpoint
INSERT INTO _migration_batch_merge_0073 (loser_id, keeper_id)
SELECT ib.id AS loser_id, x.keeper_id
FROM item_batch ib
INNER JOIN (
	SELECT
		MIN(id) AS keeper_id,
		hospital_id,
		item_id,
		batch_no,
		expiry_date,
		supplier_id,
		purchase_price
	FROM item_batch
	GROUP BY hospital_id, item_id, batch_no, expiry_date, supplier_id, purchase_price
	HAVING COUNT(*) > 1
) x ON
	x.hospital_id = ib.hospital_id
	AND x.item_id = ib.item_id
	AND x.batch_no = ib.batch_no
	AND x.expiry_date IS NOT DISTINCT FROM ib.expiry_date
	AND x.supplier_id IS NOT DISTINCT FROM ib.supplier_id
	AND x.purchase_price = ib.purchase_price
WHERE ib.id <> x.keeper_id;
--> statement-breakpoint
UPDATE inv_stock keeper
SET quantity = keeper.quantity + loser.quantity,
	updated_at = now()
FROM inv_stock loser
INNER JOIN _migration_batch_merge_0073 m ON loser.batch_id = m.loser_id
WHERE keeper.store_id = loser.store_id
	AND keeper.batch_id = m.keeper_id
	AND keeper.deleted_at IS NULL
	AND loser.deleted_at IS NULL;
--> statement-breakpoint
DELETE FROM inv_stock loser
USING _migration_batch_merge_0073 m
WHERE loser.batch_id = m.loser_id
	AND EXISTS (
		SELECT 1 FROM inv_stock keeper
		WHERE keeper.store_id = loser.store_id
			AND keeper.batch_id = m.keeper_id
			AND keeper.deleted_at IS NULL
	);
--> statement-breakpoint
UPDATE inv_stock ist SET batch_id = m.keeper_id FROM _migration_batch_merge_0073 m WHERE ist.batch_id = m.loser_id;
--> statement-breakpoint
UPDATE goods_receipt_line grl SET batch_id = m.keeper_id FROM _migration_batch_merge_0073 m WHERE grl.batch_id = m.loser_id;
--> statement-breakpoint
UPDATE inv_store_transfer_line itl SET batch_id = m.keeper_id FROM _migration_batch_merge_0073 m WHERE itl.batch_id = m.loser_id;
--> statement-breakpoint
UPDATE inv_stock_issue_line iil SET batch_id = m.keeper_id FROM _migration_batch_merge_0073 m WHERE iil.batch_id = m.loser_id;
--> statement-breakpoint
UPDATE inv_department_indent_line idl SET batch_id = m.keeper_id FROM _migration_batch_merge_0073 m WHERE idl.batch_id = m.loser_id;
--> statement-breakpoint
UPDATE inv_department_indent_line_alloc idla SET batch_id = m.keeper_id FROM _migration_batch_merge_0073 m WHERE idla.batch_id = m.loser_id;
--> statement-breakpoint
UPDATE inv_department_issue_line_alloc idila SET batch_id = m.keeper_id FROM _migration_batch_merge_0073 m WHERE idila.batch_id = m.loser_id;
--> statement-breakpoint
UPDATE inv_department_consumption_line idcl SET batch_id = m.keeper_id FROM _migration_batch_merge_0073 m WHERE idcl.batch_id = m.loser_id;
--> statement-breakpoint
DELETE FROM item_batch ib USING _migration_batch_merge_0073 m WHERE ib.id = m.loser_id;
--> statement-breakpoint
DROP TABLE IF EXISTS _migration_batch_merge_0073;
--> statement-breakpoint
ALTER TABLE purchase_order_line DROP CONSTRAINT IF EXISTS purchase_order_line_manufacturer_id_manufacturer_id_fk;
--> statement-breakpoint
ALTER TABLE purchase_order_line DROP COLUMN IF EXISTS manufacturer_id;
--> statement-breakpoint
ALTER TABLE item_batch DROP CONSTRAINT IF EXISTS item_batch_manufacturer_id_manufacturer_id_fk;
--> statement-breakpoint
ALTER TABLE item_batch DROP COLUMN IF EXISTS manufacturer_id;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS item_batch_identity_uidx ON item_batch (
	hospital_id,
	item_id,
	batch_no,
	expiry_date,
	supplier_id,
	purchase_price
) NULLS NOT DISTINCT;
--> statement-breakpoint
DROP INDEX IF EXISTS item_master_manufacturer_id_idx;
--> statement-breakpoint
ALTER TABLE item_master DROP CONSTRAINT IF EXISTS item_master_manufacturer_id_manufacturer_id_fk;
--> statement-breakpoint
ALTER TABLE item_master DROP COLUMN IF EXISTS manufacturer_id;
--> statement-breakpoint
DROP TABLE IF EXISTS manufacturer CASCADE;
