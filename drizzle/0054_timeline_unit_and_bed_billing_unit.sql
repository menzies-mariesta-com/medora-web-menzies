-- Timeline units (bed billing granularity) + bed billing unit mapping.
ALTER TABLE "unit_type" ADD COLUMN IF NOT EXISTS "is_timeline" boolean DEFAULT false NOT NULL;

ALTER TABLE "unit" ADD COLUMN IF NOT EXISTS "timeline_duration_days" numeric(18, 6);

ALTER TABLE "bed" ADD COLUMN IF NOT EXISTS "billing_unit_id" integer;

DO $$ BEGIN
	ALTER TABLE "bed" ADD CONSTRAINT "bed_billing_unit_id_unit_id_fk"
		FOREIGN KEY ("billing_unit_id") REFERENCES "public"."unit"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "ipd_bed_stay_segment" ADD COLUMN IF NOT EXISTS "billing_unit_id_snapshot" integer;
ALTER TABLE "ipd_bed_stay_segment" ADD COLUMN IF NOT EXISTS "billing_unit_name_snapshot" varchar(512);
ALTER TABLE "ipd_bed_stay_segment" ADD COLUMN IF NOT EXISTS "timeline_duration_days_snapshot" numeric(18, 6);

INSERT INTO "unit_type" ("id", "name", "status_id", "is_timeline")
VALUES (11, 'Timeline', 1, true)
ON CONFLICT ("id") DO UPDATE SET "is_timeline" = true, "name" = EXCLUDED."name";

INSERT INTO "unit" ("id", "name", "unit_type_id", "status_id", "timeline_duration_days")
VALUES (23, 'Day', 11, 1, 1)
ON CONFLICT ("id") DO UPDATE SET
	"unit_type_id" = 11,
	"timeline_duration_days" = 1,
	"name" = EXCLUDED."name";
