-- Formula templates are module-agnostic; module is bound only on inv_module_pricing_assignment.

ALTER TABLE "inv_pricing_formula_template"
	DROP CONSTRAINT IF EXISTS "inv_pricing_formula_template_module_chk";

DROP INDEX IF EXISTS "inv_pricing_formula_template_hospital_module_name_uidx";
DROP INDEX IF EXISTS "inv_pricing_formula_template_hospital_module_default_uidx";
DROP INDEX IF EXISTS "inv_pricing_formula_template_hospital_module_idx";

ALTER TABLE "inv_pricing_formula_template" DROP COLUMN IF EXISTS "module";

CREATE UNIQUE INDEX IF NOT EXISTS "inv_pricing_formula_template_hospital_name_uidx"
	ON "inv_pricing_formula_template" ("hospital_id", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "inv_pricing_formula_template_hospital_default_uidx"
	ON "inv_pricing_formula_template" ("hospital_id")
	WHERE "is_system_default" = true;
