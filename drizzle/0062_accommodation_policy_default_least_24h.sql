-- Default minimum bill block to 24 hours for IP/ED accommodation policy.
ALTER TABLE "ipd_accommodation_billing_policy"
	ALTER COLUMN "least_bill_duration_hours" SET DEFAULT 24;

UPDATE "ipd_accommodation_billing_policy"
SET "least_bill_duration_hours" = 24
WHERE "least_bill_duration_hours" IS NULL;

UPDATE "ipd_bed_stay_segment"
SET "least_bill_duration_hours_snapshot" = 24
WHERE "least_bill_duration_hours_snapshot" IS NULL;
