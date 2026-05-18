-- Composable GRN pricing flags (replace preset method enums).

ALTER TABLE "inv_branch_pricing_config" ADD COLUMN IF NOT EXISTS "sale_manual_on_grn_line" boolean NOT NULL DEFAULT false;
ALTER TABLE "inv_branch_pricing_config" ADD COLUMN IF NOT EXISTS "sale_include_discount" boolean NOT NULL DEFAULT true;
ALTER TABLE "inv_branch_pricing_config" ADD COLUMN IF NOT EXISTS "sale_include_tax" boolean NOT NULL DEFAULT true;
ALTER TABLE "inv_branch_pricing_config" ADD COLUMN IF NOT EXISTS "sale_include_free_qty" boolean NOT NULL DEFAULT false;
ALTER TABLE "inv_branch_pricing_config" ADD COLUMN IF NOT EXISTS "emp_manual_on_grn_line" boolean NOT NULL DEFAULT false;
ALTER TABLE "inv_branch_pricing_config" ADD COLUMN IF NOT EXISTS "emp_include_discount" boolean NOT NULL DEFAULT true;
ALTER TABLE "inv_branch_pricing_config" ADD COLUMN IF NOT EXISTS "emp_include_tax" boolean NOT NULL DEFAULT true;
ALTER TABLE "inv_branch_pricing_config" ADD COLUMN IF NOT EXISTS "emp_markup_percent" numeric(8, 2) NOT NULL DEFAULT '0';
ALTER TABLE "inv_branch_pricing_config" ADD COLUMN IF NOT EXISTS "emp_use_percent_of_sale" boolean NOT NULL DEFAULT false;

-- Backfill from legacy enum columns when present.
UPDATE "inv_branch_pricing_config"
SET
	"sale_manual_on_grn_line" = ("sale_price_method" = 'MANUAL'),
	"sale_include_discount" = ("sale_price_method" IN ('LANDED_PER_RECEIVED', 'MARKUP_LANDED')),
	"sale_include_tax" = ("sale_price_method" IN ('LANDED_PER_RECEIVED', 'MARKUP_LANDED')),
	"sale_include_free_qty" = false,
	"emp_manual_on_grn_line" = ("emp_sale_price_method" = 'MANUAL'),
	"emp_use_percent_of_sale" = ("emp_sale_price_method" = 'PERCENT_OF_SALE'),
	"emp_include_discount" = ("emp_sale_price_method" = 'LANDED_SPREAD'),
	"emp_include_tax" = ("emp_sale_price_method" = 'LANDED_SPREAD'),
	"emp_markup_percent" = '0'
WHERE "sale_price_method" IS NOT NULL;

ALTER TABLE "inv_branch_pricing_config" DROP COLUMN IF EXISTS "sale_price_method";
ALTER TABLE "inv_branch_pricing_config" DROP COLUMN IF EXISTS "emp_sale_price_method";
