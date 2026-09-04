-- Template library + per (branch, module) assignment (replaces inv_branch_pricing_config over time).

CREATE TABLE IF NOT EXISTS "inv_pricing_formula_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"name" varchar(128) NOT NULL,
	"description" text,
	"formula_version" integer NOT NULL DEFAULT 1,
	"sale_include_discount" boolean NOT NULL DEFAULT true,
	"sale_include_tax" boolean NOT NULL DEFAULT true,
	"sale_include_free_qty" boolean NOT NULL DEFAULT false,
	"msl_markup_percent" numeric(8, 2) NOT NULL DEFAULT '0',
	"slot_order" jsonb NOT NULL DEFAULT '["COST","MSL","ITEM","STORE"]'::jsonb,
	"emp_use_percent_of_sale" boolean NOT NULL DEFAULT false,
	"emp_percent_of_sale" numeric(8, 2) NOT NULL DEFAULT '100',
	"emp_include_discount" boolean NOT NULL DEFAULT true,
	"emp_include_tax" boolean NOT NULL DEFAULT true,
	"emp_include_free_qty" boolean NOT NULL DEFAULT true,
	"is_system_default" boolean NOT NULL DEFAULT false,
	"status_id" integer NOT NULL REFERENCES "status"("id") DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "inv_pricing_formula_template_hospital_name_uidx"
	ON "inv_pricing_formula_template" ("hospital_id", "name");

CREATE INDEX IF NOT EXISTS "inv_pricing_formula_template_hospital_idx"
	ON "inv_pricing_formula_template" ("hospital_id");

CREATE TABLE IF NOT EXISTS "inv_module_pricing_assignment" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"branch_id" uuid NOT NULL REFERENCES "hospital_branch"("id") ON DELETE CASCADE,
	"module" varchar(16) NOT NULL,
	"formula_template_id" integer NOT NULL REFERENCES "inv_pricing_formula_template"("id") ON DELETE RESTRICT,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inv_module_pricing_assignment_module_chk"
		CHECK ("module" IN ('MO', 'DC', 'BILLING'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "inv_module_pricing_assignment_scope_uidx"
	ON "inv_module_pricing_assignment" ("hospital_id", "branch_id", "module");

CREATE INDEX IF NOT EXISTS "inv_module_pricing_assignment_hospital_idx"
	ON "inv_module_pricing_assignment" ("hospital_id");

CREATE INDEX IF NOT EXISTS "inv_module_pricing_assignment_template_idx"
	ON "inv_module_pricing_assignment" ("formula_template_id");

-- Migrate inv_branch_pricing_config → one "Standard" template per hospital + MO/DC/BILLING assignments per branch.
INSERT INTO "inv_pricing_formula_template" (
	"hospital_id",
	"name",
	"description",
	"formula_version",
	"sale_include_discount",
	"sale_include_tax",
	"sale_include_free_qty",
	"msl_markup_percent",
	"emp_use_percent_of_sale",
	"emp_percent_of_sale",
	"emp_include_discount",
	"emp_include_tax",
	"emp_include_free_qty",
	"is_system_default",
	"status_id"
)
SELECT DISTINCT ON (c."hospital_id")
	c."hospital_id",
	'Standard',
	'Migrated from branch GRN pricing configuration',
	1,
	c."sale_include_discount",
	c."sale_include_tax",
	c."sale_include_free_qty",
	c."sale_markup_percent",
	c."emp_use_percent_of_sale",
	c."emp_percent_of_sale",
	c."emp_include_discount",
	c."emp_include_tax",
	c."emp_include_free_qty",
	true,
	1
FROM "inv_branch_pricing_config" c
ORDER BY c."hospital_id", c."id" ASC
ON CONFLICT ("hospital_id", "name") DO NOTHING;

INSERT INTO "inv_module_pricing_assignment" (
	"hospital_id",
	"branch_id",
	"module",
	"formula_template_id"
)
SELECT
	c."hospital_id",
	c."branch_id",
	m.mod,
	t."id"
FROM "inv_branch_pricing_config" c
INNER JOIN "inv_pricing_formula_template" t
	ON t."hospital_id" = c."hospital_id"
	AND t."name" = 'Standard'
CROSS JOIN (VALUES ('MO'), ('DC'), ('BILLING')) AS m(mod)
ON CONFLICT ("hospital_id", "branch_id", "module") DO NOTHING;
