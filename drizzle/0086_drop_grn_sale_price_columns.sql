-- Phase 7: remove GRN-time sale price storage and deprecated branch pricing config.

ALTER TABLE "item_batch" DROP COLUMN IF EXISTS "sale_price";
ALTER TABLE "item_batch" DROP COLUMN IF EXISTS "emp_sale_price";

ALTER TABLE "goods_receipt_line" DROP COLUMN IF EXISTS "sale_price";
ALTER TABLE "goods_receipt_line" DROP COLUMN IF EXISTS "emp_sale_price";

DROP TABLE IF EXISTS "inv_branch_pricing_config";
