-- Per-branch GRN sale / employee sale price calculation rules.
CREATE TABLE IF NOT EXISTS "inv_branch_pricing_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"branch_id" uuid NOT NULL REFERENCES "hospital_branch"("id") ON DELETE CASCADE,
	"sale_price_method" varchar(32) NOT NULL DEFAULT 'LANDED_PER_RECEIVED',
	"sale_markup_percent" numeric(8, 2) NOT NULL DEFAULT '0',
	"emp_sale_price_method" varchar(32) NOT NULL DEFAULT 'LANDED_SPREAD',
	"emp_percent_of_sale" numeric(8, 2) NOT NULL DEFAULT '100',
	"emp_include_free_qty" boolean NOT NULL DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "inv_branch_pricing_config_hospital_branch_uidx"
	ON "inv_branch_pricing_config" ("hospital_id", "branch_id");

CREATE INDEX IF NOT EXISTS "inv_branch_pricing_config_hospital_idx"
	ON "inv_branch_pricing_config" ("hospital_id");
