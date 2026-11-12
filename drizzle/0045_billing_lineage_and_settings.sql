-- Visit lineage on patient_visit; hospital billing visit-open mode; rename admission order source column.

ALTER TABLE "patient_visit" ADD COLUMN IF NOT EXISTS "source_visit_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_source_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("source_visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_visit_source_visit_id_idx" ON "patient_visit" USING btree ("source_visit_id");
--> statement-breakpoint
UPDATE "patient_visit" pv
SET "source_visit_id" = a."source_opd_visit_id"
FROM "ipd_admission" a
WHERE a."visit_id" = pv."id"
	AND a."source_opd_visit_id" IS NOT NULL
	AND pv."source_visit_id" IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospital_billing_setting" (
	"hospital_id" uuid PRIMARY KEY NOT NULL,
	"visit_open_mode" smallint NOT NULL DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "hospital_billing_setting" ADD CONSTRAINT "hospital_billing_setting_hospital_id_hospital_id_fk"
		FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
INSERT INTO "hospital_billing_setting" ("hospital_id", "visit_open_mode")
SELECT h."id", 1
FROM "hospital" h
WHERE NOT EXISTS (
	SELECT 1 FROM "hospital_billing_setting" s WHERE s."hospital_id" = h."id"
);
--> statement-breakpoint
ALTER TABLE "ipd_admission_order" RENAME COLUMN "source_opd_visit_id" TO "source_visit_id";
--> statement-breakpoint
ALTER INDEX IF EXISTS "ipd_admission_order_source_opd_visit_id_idx" RENAME TO "ipd_admission_order_source_visit_id_idx";
--> statement-breakpoint
ALTER INDEX IF EXISTS "ipd_admission_order_pending_source_opd_uidx" RENAME TO "ipd_admission_order_pending_source_visit_uidx";
