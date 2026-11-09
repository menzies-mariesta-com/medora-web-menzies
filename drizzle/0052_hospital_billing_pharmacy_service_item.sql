-- Placeholder service item for medication order lines on OP/IP bills (category grouping).
ALTER TABLE "hospital_billing_setting" ADD COLUMN IF NOT EXISTS "pharmacy_billing_service_item_id" integer;

DO $$ BEGIN
	ALTER TABLE "hospital_billing_setting" ADD CONSTRAINT "hospital_billing_setting_pharmacy_billing_service_item_id_service_item_id_fk"
		FOREIGN KEY ("pharmacy_billing_service_item_id") REFERENCES "public"."service_item"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
