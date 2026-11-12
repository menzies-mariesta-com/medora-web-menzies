-- Bed billing uses least qty × timeline unit only.
ALTER TABLE "ipd_bed_stay_segment" DROP COLUMN IF EXISTS "billing_method_snapshot";
ALTER TABLE "ipd_bed_stay_segment" DROP COLUMN IF EXISTS "grace_minutes_snapshot";
ALTER TABLE "ipd_bed_stay_segment" DROP COLUMN IF EXISTS "minimum_days_snapshot";
ALTER TABLE "ipd_bed_stay_segment" DROP COLUMN IF EXISTS "least_bill_duration_hours_snapshot";
ALTER TABLE "ipd_bed_stay_segment" DROP COLUMN IF EXISTS "cutoff_time_snapshot";

ALTER TABLE "ipd_accommodation_billing_policy" DROP COLUMN IF EXISTS "billing_method";
ALTER TABLE "ipd_accommodation_billing_policy" DROP COLUMN IF EXISTS "grace_minutes";
ALTER TABLE "ipd_accommodation_billing_policy" DROP COLUMN IF EXISTS "minimum_days";
ALTER TABLE "ipd_accommodation_billing_policy" DROP COLUMN IF EXISTS "cutoff_time";
ALTER TABLE "ipd_accommodation_billing_policy" DROP COLUMN IF EXISTS "least_bill_duration_hours";
