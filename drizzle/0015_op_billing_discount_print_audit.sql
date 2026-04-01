DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.tables
		WHERE table_schema = 'public'
			AND table_name = 'op_billing'
	) THEN
		ALTER TABLE "op_billing"
			ADD COLUMN IF NOT EXISTS "discounted_by_staff_id" uuid,
			ADD COLUMN IF NOT EXISTS "discounted_at" timestamp with time zone,
			ADD COLUMN IF NOT EXISTS "printed_by_staff_id" uuid,
			ADD COLUMN IF NOT EXISTS "printed_at" timestamp with time zone;

		ALTER TABLE "op_billing" DROP CONSTRAINT IF EXISTS "op_billing_discounted_by_staff_id_staff_id_fk";
		ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_discounted_by_staff_id_staff_id_fk"
			FOREIGN KEY ("discounted_by_staff_id") REFERENCES "public"."staff"("id")
			ON DELETE SET NULL ON UPDATE NO ACTION;

		ALTER TABLE "op_billing" DROP CONSTRAINT IF EXISTS "op_billing_printed_by_staff_id_staff_id_fk";
		ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_printed_by_staff_id_staff_id_fk"
			FOREIGN KEY ("printed_by_staff_id") REFERENCES "public"."staff"("id")
			ON DELETE SET NULL ON UPDATE NO ACTION;

		CREATE INDEX IF NOT EXISTS "op_billing_discounted_by_staff_id_idx"
			ON "op_billing" USING btree ("discounted_by_staff_id");
		CREATE INDEX IF NOT EXISTS "op_billing_printed_by_staff_id_idx"
			ON "op_billing" USING btree ("printed_by_staff_id");
	END IF;
END $$;

