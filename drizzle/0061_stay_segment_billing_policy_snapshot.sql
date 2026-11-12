-- Freeze accommodation billing rules on each bed assignment; link IP bill lines to segments.
ALTER TABLE "ipd_bed_stay_segment" ADD COLUMN IF NOT EXISTS "billing_method_snapshot" integer;
ALTER TABLE "ipd_bed_stay_segment" ADD COLUMN IF NOT EXISTS "grace_minutes_snapshot" integer;
ALTER TABLE "ipd_bed_stay_segment" ADD COLUMN IF NOT EXISTS "minimum_days_snapshot" numeric(8, 4);
ALTER TABLE "ipd_bed_stay_segment" ADD COLUMN IF NOT EXISTS "least_bill_duration_hours_snapshot" numeric(8, 4);
ALTER TABLE "ipd_bed_stay_segment" ADD COLUMN IF NOT EXISTS "cutoff_time_snapshot" varchar(8);

ALTER TABLE "ip_billing_line" ADD COLUMN IF NOT EXISTS "ipd_bed_stay_segment_id" integer;

DO $$ BEGIN
	ALTER TABLE "ip_billing_line" ADD CONSTRAINT "ip_billing_line_ipd_bed_stay_segment_id_fk"
		FOREIGN KEY ("ipd_bed_stay_segment_id") REFERENCES "public"."ipd_bed_stay_segment"("id")
		ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "ip_billing_line_ipd_bed_stay_segment_id_idx"
	ON "ip_billing_line" ("ipd_bed_stay_segment_id");

-- Backfill open/historical segments from current hospital IP policy (best-effort for legacy rows).
UPDATE "ipd_bed_stay_segment" AS s
SET
	"billing_method_snapshot" = p."billing_method",
	"grace_minutes_snapshot" = p."grace_minutes",
	"minimum_days_snapshot" = p."minimum_days",
	"least_bill_duration_hours_snapshot" = p."least_bill_duration_hours",
	"cutoff_time_snapshot" = p."cutoff_time"
FROM "ipd_accommodation_billing_policy" AS p
WHERE p."hospital_id" = s."hospital_id"
	AND p."care_setting" = 'IP'
	AND s."billing_method_snapshot" IS NULL;
