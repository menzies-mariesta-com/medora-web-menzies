-- Cleanup: remove temporary mixed-table Department Issue approach.
-- After switching to `inv_department_issue*`, these columns are no longer needed.

ALTER TABLE "inv_department_indent" DROP COLUMN IF EXISTS "doc_type";
--> statement-breakpoint
ALTER TABLE "inv_department_indent" DROP COLUMN IF EXISTS "source_indent_id";
--> statement-breakpoint
ALTER TABLE "inv_department_indent" DROP COLUMN IF EXISTS "issue_no";

