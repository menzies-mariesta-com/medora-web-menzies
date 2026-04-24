-- Make medication-order setup masters global (not hospital-scoped).
-- They can still be read from hospital-scoped routes, but data is shared across hospitals/branches.

ALTER TABLE "med_order_form" ALTER COLUMN "hospital_id" DROP NOT NULL;
ALTER TABLE "med_order_route" ALTER COLUMN "hospital_id" DROP NOT NULL;
ALTER TABLE "med_order_order_type" ALTER COLUMN "hospital_id" DROP NOT NULL;
ALTER TABLE "med_order_dose_unit" ALTER COLUMN "hospital_id" DROP NOT NULL;
ALTER TABLE "med_order_food_relation" ALTER COLUMN "hospital_id" DROP NOT NULL;
ALTER TABLE "med_order_duration_unit" ALTER COLUMN "hospital_id" DROP NOT NULL;
ALTER TABLE "med_order_frequency" ALTER COLUMN "hospital_id" DROP NOT NULL;

-- Global uniqueness for duration unit code (hospital_id is NULL for global rows).
DROP INDEX IF EXISTS "med_order_duration_unit_hospital_code_uidx";
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_duration_unit_global_code_uidx"
	ON "med_order_duration_unit" ("code")
	WHERE "deleted_at" IS NULL
		AND "hospital_id" IS NULL;

