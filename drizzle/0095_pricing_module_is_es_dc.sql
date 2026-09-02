-- Pricing assignment modules: MO→Internal Sales (IS), BILLING→External Sales (ES), DC unchanged.

ALTER TABLE "inv_module_pricing_assignment"
	DROP CONSTRAINT IF EXISTS "inv_module_pricing_assignment_module_chk";

UPDATE "inv_module_pricing_assignment"
SET "module" = 'IS'
WHERE "module" = 'MO';

UPDATE "inv_module_pricing_assignment"
SET "module" = 'ES'
WHERE "module" = 'BILLING';

INSERT INTO "inv_module_pricing_assignment" (
	"hospital_id",
	"branch_id",
	"module",
	"formula_template_id"
)
SELECT
	a."hospital_id",
	a."branch_id",
	'ES',
	a."formula_template_id"
FROM "inv_module_pricing_assignment" a
WHERE a."module" = 'IS'
	AND NOT EXISTS (
		SELECT 1
		FROM "inv_module_pricing_assignment" b
		WHERE b."hospital_id" = a."hospital_id"
			AND b."branch_id" = a."branch_id"
			AND b."module" = 'ES'
	);

ALTER TABLE "inv_module_pricing_assignment"
	ADD CONSTRAINT "inv_module_pricing_assignment_module_chk"
	CHECK ("module" IN ('IS', 'ES', 'DC'));
