ALTER TABLE "ipd_accommodation_billing_policy" ADD COLUMN IF NOT EXISTS "accommodation_bill_unit_id" integer;

DO $$ BEGIN
	ALTER TABLE "ipd_accommodation_billing_policy" ADD CONSTRAINT "ipd_accommodation_billing_policy_accommodation_bill_unit_id_unit_id_fk"
		FOREIGN KEY ("accommodation_bill_unit_id") REFERENCES "public"."unit"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
