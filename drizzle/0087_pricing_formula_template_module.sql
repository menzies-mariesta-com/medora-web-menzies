-- Each formula template belongs to one charge module (MO, DC, BILLING); single price path per template.

ALTER TABLE "inv_pricing_formula_template"
	ADD COLUMN IF NOT EXISTS "module" varchar(16);

UPDATE "inv_pricing_formula_template" t
SET "module" = a."module"
FROM "inv_module_pricing_assignment" a
WHERE a."formula_template_id" = t."id"
	AND t."module" IS NULL;

UPDATE "inv_pricing_formula_template"
SET "module" = 'MO'
WHERE "module" IS NULL;

ALTER TABLE "inv_pricing_formula_template"
	ALTER COLUMN "module" SET NOT NULL;

ALTER TABLE "inv_pricing_formula_template"
	ADD COLUMN IF NOT EXISTS "include_discount" boolean NOT NULL DEFAULT true;

ALTER TABLE "inv_pricing_formula_template"
	ADD COLUMN IF NOT EXISTS "include_tax" boolean NOT NULL DEFAULT true;

ALTER TABLE "inv_pricing_formula_template"
	ADD COLUMN IF NOT EXISTS "include_free_qty" boolean NOT NULL DEFAULT false;

UPDATE "inv_pricing_formula_template"
SET
	"include_discount" = COALESCE("sale_include_discount", true),
	"include_tax" = COALESCE("sale_include_tax", true),
	"include_free_qty" = COALESCE("sale_include_free_qty", false)
WHERE "include_discount" IS DISTINCT FROM COALESCE("sale_include_discount", true)
	OR "include_tax" IS DISTINCT FROM COALESCE("sale_include_tax", true)
	OR "include_free_qty" IS DISTINCT FROM COALESCE("sale_include_free_qty", false);

ALTER TABLE "inv_pricing_formula_template" DROP COLUMN IF EXISTS "sale_include_discount";
ALTER TABLE "inv_pricing_formula_template" DROP COLUMN IF EXISTS "sale_include_tax";
ALTER TABLE "inv_pricing_formula_template" DROP COLUMN IF EXISTS "sale_include_free_qty";
ALTER TABLE "inv_pricing_formula_template" DROP COLUMN IF EXISTS "emp_use_percent_of_sale";
ALTER TABLE "inv_pricing_formula_template" DROP COLUMN IF EXISTS "emp_percent_of_sale";
ALTER TABLE "inv_pricing_formula_template" DROP COLUMN IF EXISTS "emp_include_discount";
ALTER TABLE "inv_pricing_formula_template" DROP COLUMN IF EXISTS "emp_include_tax";
ALTER TABLE "inv_pricing_formula_template" DROP COLUMN IF EXISTS "emp_include_free_qty";

DROP INDEX IF EXISTS "inv_pricing_formula_template_hospital_name_uidx";

CREATE UNIQUE INDEX IF NOT EXISTS "inv_pricing_formula_template_hospital_module_name_uidx"
	ON "inv_pricing_formula_template" ("hospital_id", "module", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "inv_pricing_formula_template_hospital_module_default_uidx"
	ON "inv_pricing_formula_template" ("hospital_id", "module")
	WHERE "is_system_default" = true;

CREATE INDEX IF NOT EXISTS "inv_pricing_formula_template_hospital_module_idx"
	ON "inv_pricing_formula_template" ("hospital_id", "module");

ALTER TABLE "inv_pricing_formula_template"
	DROP CONSTRAINT IF EXISTS "inv_pricing_formula_template_module_chk";

ALTER TABLE "inv_pricing_formula_template"
	ADD CONSTRAINT "inv_pricing_formula_template_module_chk"
	CHECK ("module" IN ('MO', 'DC', 'BILLING'));
