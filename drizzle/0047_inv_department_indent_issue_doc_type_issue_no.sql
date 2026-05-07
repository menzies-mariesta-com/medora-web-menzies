-- Department indent: support "issue document" stage using doc_type
-- - INDENT doc (sub store → central)
-- - ISSUE doc (created in central; receiver gets allocations back)
ALTER TABLE "inv_department_indent"
	ADD COLUMN IF NOT EXISTS "doc_type" varchar(16) NOT NULL DEFAULT 'INDENT';
--> statement-breakpoint
ALTER TABLE "inv_department_indent"
	ADD COLUMN IF NOT EXISTS "source_indent_id" uuid;
--> statement-breakpoint
ALTER TABLE "inv_department_indent"
	ADD COLUMN IF NOT EXISTS "issue_no" varchar(128);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'inv_department_indent_doc_type_chk'
	) THEN
		ALTER TABLE "inv_department_indent"
			ADD CONSTRAINT "inv_department_indent_doc_type_chk"
			CHECK ("doc_type" IN ('INDENT', 'ISSUE'));
	END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'inv_department_indent_source_indent_id_fk'
	) THEN
		ALTER TABLE "inv_department_indent"
			ADD CONSTRAINT "inv_department_indent_source_indent_id_fk"
			FOREIGN KEY ("source_indent_id")
			REFERENCES "public"."inv_department_indent"("id")
			ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END
$$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_department_indent_hospital_doc_type_status_idx"
	ON "inv_department_indent" ("hospital_id", "doc_type", "status_tagging_id");

