ALTER TABLE "prefix_format" ADD COLUMN IF NOT EXISTS "counter_include_branch" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "prefix_format" ADD COLUMN IF NOT EXISTS "counter_include_financial_year" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE "prefix_format" ADD COLUMN IF NOT EXISTS "counter_include_visit_type" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
UPDATE "prefix_format"
SET
	"counter_include_branch" = ("key" = 'VISIT_NO'),
	"counter_include_financial_year" = true,
	"counter_include_visit_type" = ("key" = 'VISIT_NO');
--> statement-breakpoint
UPDATE "prefix_counter" AS pc
SET "scope_key" =
	pc."hospital_id"::text
	|| '|'
	|| CASE
		WHEN pf."counter_include_branch" THEN COALESCE(pc."branch_id"::text, '')
		ELSE ''
	END
	|| '|'
	|| CASE
		WHEN pf."counter_include_financial_year" THEN COALESCE(pc."financial_year_id"::text, '')
		ELSE ''
	END
	|| '|'
	|| pc."key"
	|| '|'
	|| CASE
		WHEN pf."counter_include_visit_type" THEN COALESCE(pc."visit_type_id"::text, '')
		ELSE ''
	END
FROM "prefix_format" AS pf
WHERE pf."hospital_id" = pc."hospital_id"
	AND pf."key" = pc."key"
	AND pf."deleted_at" IS NULL;
