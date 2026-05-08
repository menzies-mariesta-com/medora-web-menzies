ALTER TABLE "inv_department_indent" ADD COLUMN IF NOT EXISTS "cancelled_by" text;
--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD COLUMN IF NOT EXISTS "cancel_reason" text;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'inv_department_indent_cancelled_by_user_id_fk'
	) THEN
		ALTER TABLE "inv_department_indent"
			ADD CONSTRAINT "inv_department_indent_cancelled_by_user_id_fk"
			FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id")
			ON DELETE SET NULL ON UPDATE CASCADE;
	END IF;
END $$;
