-- Least-bill rules come from live ipd_accommodation_billing_policy only (not per-segment snapshots).
ALTER TABLE "ipd_bed_stay_segment" DROP COLUMN IF EXISTS "least_bill_duration_snapshot";
ALTER TABLE "ipd_bed_stay_segment" DROP COLUMN IF EXISTS "least_bill_duration_unit_id_snapshot";
