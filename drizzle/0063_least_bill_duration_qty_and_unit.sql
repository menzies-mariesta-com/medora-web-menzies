-- Least bill block = qty × timeline unit; same unit on IP bill lines.
ALTER TABLE "ipd_accommodation_billing_policy"
	ADD COLUMN IF NOT EXISTS "least_bill_duration" numeric(8, 4) DEFAULT 1;

UPDATE "ipd_accommodation_billing_policy"
SET "least_bill_duration" = 1
WHERE "least_bill_duration" IS NULL;

ALTER TABLE "ipd_bed_stay_segment"
	ADD COLUMN IF NOT EXISTS "least_bill_duration_snapshot" numeric(8, 4);

ALTER TABLE "ipd_bed_stay_segment"
	ADD COLUMN IF NOT EXISTS "least_bill_duration_unit_id_snapshot" integer;

DO $$ BEGIN
	ALTER TABLE "ipd_bed_stay_segment" ADD CONSTRAINT "ipd_bed_stay_segment_least_unit_id_fk"
		FOREIGN KEY ("least_bill_duration_unit_id_snapshot") REFERENCES "public"."unit"("id")
		ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

UPDATE "ipd_bed_stay_segment" AS s
SET
	"least_bill_duration_snapshot" = COALESCE(p."least_bill_duration", 1),
	"least_bill_duration_unit_id_snapshot" = p."accommodation_bill_unit_id"
FROM "ipd_accommodation_billing_policy" AS p
WHERE p."hospital_id" = s."hospital_id"
	AND p."care_setting" = 'IP'
	AND s."least_bill_duration_snapshot" IS NULL;
