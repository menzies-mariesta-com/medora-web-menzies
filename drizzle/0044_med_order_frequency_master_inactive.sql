-- Make med_order_frequency a true global master (no hospital_id FK),
-- and add a hospital-scoped inactive relation table that stores only disabled rows.

-- 1) Drop old indexes that reference hospital_id
DROP INDEX IF EXISTS "med_order_frequency_hospital_id_idx";
DROP INDEX IF EXISTS "med_order_frequency_hospital_preset_idx";

-- 2) Drop old preset uniqueness indexes that referenced hospital_id
DROP INDEX IF EXISTS "med_order_frequency_preset_global_abbreviation_uidx";
DROP INDEX IF EXISTS "med_order_frequency_preset_global_label_uidx";

-- 3) Drop hospital_id FK + column from master table
ALTER TABLE "med_order_frequency"
	DROP CONSTRAINT IF EXISTS "med_order_frequency_hospital_id_hospital_id_fk";

ALTER TABLE "med_order_frequency"
	DROP COLUMN IF EXISTS "hospital_id";

-- 4) Recreate preset uniqueness (global)
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_frequency_preset_global_abbreviation_uidx"
	ON "med_order_frequency" ("abbreviation")
	WHERE "deleted_at" IS NULL
		AND "is_preset" = true
		AND "abbreviation" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "med_order_frequency_preset_global_label_uidx"
	ON "med_order_frequency" ("label")
	WHERE "deleted_at" IS NULL
		AND "is_preset" = true
		AND "abbreviation" IS NULL;

-- 5) Preset lookup index without hospital_id
CREATE INDEX IF NOT EXISTS "med_order_frequency_preset_idx"
	ON "med_order_frequency" ("is_preset")
	WHERE "deleted_at" IS NULL;

-- 6) Hospital-scoped inactive relation table
CREATE TABLE IF NOT EXISTS "med_order_frequency_inactive" (
	"hospital_id" uuid NOT NULL,
	"frequency_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "med_order_frequency_inactive_hospital_id_hospital_id_fk"
		FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_frequency_inactive_frequency_id_med_order_frequency_id_fk"
		FOREIGN KEY ("frequency_id") REFERENCES "public"."med_order_frequency"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_frequency_inactive_created_by_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."user"("id")
		ON DELETE set null ON UPDATE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "med_order_frequency_inactive_hospital_frequency_uidx"
	ON "med_order_frequency_inactive" ("hospital_id", "frequency_id");

CREATE INDEX IF NOT EXISTS "med_order_frequency_inactive_hospital_id_idx"
	ON "med_order_frequency_inactive" ("hospital_id");

CREATE INDEX IF NOT EXISTS "med_order_frequency_inactive_frequency_id_idx"
	ON "med_order_frequency_inactive" ("frequency_id");

