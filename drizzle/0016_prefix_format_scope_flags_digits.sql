ALTER TABLE "prefix_format"
	ALTER COLUMN "counter_include_branch" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "prefix_format"
	ALTER COLUMN "counter_include_financial_year" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "prefix_format"
	ALTER COLUMN "counter_include_visit_type" DROP DEFAULT;
--> statement-breakpoint

ALTER TABLE "prefix_format"
	ALTER COLUMN "counter_include_branch" TYPE integer USING (CASE WHEN "counter_include_branch" THEN 1 ELSE 0 END);
--> statement-breakpoint
ALTER TABLE "prefix_format"
	ALTER COLUMN "counter_include_financial_year" TYPE integer USING (CASE WHEN "counter_include_financial_year" THEN 1 ELSE 0 END);
--> statement-breakpoint
ALTER TABLE "prefix_format"
	ALTER COLUMN "counter_include_visit_type" TYPE integer USING (CASE WHEN "counter_include_visit_type" THEN 1 ELSE 0 END);
--> statement-breakpoint

ALTER TABLE "prefix_format"
	ALTER COLUMN "counter_include_branch" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "prefix_format"
	ALTER COLUMN "counter_include_financial_year" SET DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "prefix_format"
	ALTER COLUMN "counter_include_visit_type" SET DEFAULT 0;
--> statement-breakpoint

UPDATE "prefix_counter" AS pc
SET "scope_key" =
	pc."hospital_id"::text
	|| '|'
	|| CASE
		WHEN pf."counter_include_branch" = 1 THEN COALESCE(pc."branch_id"::text, '')
		ELSE ''
	END
	|| '|'
	|| CASE
		WHEN pf."counter_include_financial_year" = 1 THEN COALESCE(pc."financial_year_id"::text, '')
		ELSE ''
	END
	|| '|'
	|| pc."key"
	|| '|'
	|| CASE
		WHEN pf."counter_include_visit_type" = 1 THEN COALESCE(pc."visit_type_id"::text, '')
		ELSE ''
	END
FROM "prefix_format" AS pf
WHERE pf."hospital_id" = pc."hospital_id"
	AND pf."key" = pc."key"
	AND pf."deleted_at" IS NULL;

