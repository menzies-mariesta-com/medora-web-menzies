-- Remove store_type and central purchasing config (CPS)
-- - Drop store_type master + store.store_type_id
-- - Drop hospital_inventory_config (central_purchasing_store_id)

-- 1) store: drop store_type_id
ALTER TABLE "store" DROP COLUMN IF EXISTS "store_type_id";

-- 2) store_type: drop master table
DROP TABLE IF EXISTS "store_type";

-- 3) hospital_inventory_config: drop table (CPS removed completely)
DROP TABLE IF EXISTS "hospital_inventory_config";

