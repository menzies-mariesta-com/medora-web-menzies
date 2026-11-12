-- Rename bed billing unit → base price unit; add least bill duration on IP policy.
-- No backfill: legacy stay segments keep null unit snapshots; billing resolves from
-- current bed.base_price_unit_id + segment price snapshots at charge time.
ALTER TABLE "bed" RENAME COLUMN "billing_unit_id" TO "base_price_unit_id";

ALTER TABLE "ipd_bed_stay_segment" RENAME COLUMN "billing_unit_id_snapshot" TO "base_price_unit_id_snapshot";
ALTER TABLE "ipd_bed_stay_segment" RENAME COLUMN "billing_unit_name_snapshot" TO "base_price_unit_name_snapshot";

ALTER TABLE "ipd_accommodation_billing_policy"
	ADD COLUMN IF NOT EXISTS "least_bill_duration_hours" numeric(8, 4);

DO $$ BEGIN
	ALTER TABLE "bed" RENAME CONSTRAINT "bed_billing_unit_id_unit_id_fk" TO "bed_base_price_unit_id_unit_id_fk";
EXCEPTION
	WHEN undefined_object THEN null;
END $$;
