-- Global masters for form, order type, dose unit, food relation, duration unit
-- (no hospital_id on master; per-hospital disable via *_inactive tables).

-- --- Duration: reassign order lines, then keep one row per code (per-hospital duplicates from 0038 seed)
UPDATE "medication_order_line" l
SET "duration_unit_id" = dmin."keep_id"
FROM (
	SELECT d."id" AS "old_id",
		(SELECT MIN(d2."id")
		 FROM "med_order_duration_unit" d2
		 WHERE d2."code" = d."code" AND d2."deleted_at" IS NULL) AS "keep_id"
	FROM "med_order_duration_unit" d
) dmin
WHERE l."duration_unit_id" = dmin."old_id"
	AND dmin."keep_id" IS NOT NULL
	AND dmin."old_id" <> dmin."keep_id";

DELETE FROM "med_order_duration_unit" f
WHERE EXISTS (
		SELECT 1
		FROM "med_order_duration_unit" f2
		WHERE f2."code" = f."code"
			AND f2."deleted_at" IS NULL
			AND f2."id" < f."id"
	)
	AND f."deleted_at" IS NULL;

-- --- Form / order type / dose unit / food: reassign and dedupe by name
UPDATE "medication_order_line" l
SET "form_id" = k."keep_id"
FROM (
	SELECT f."id" AS "old_id",
		(SELECT MIN(f2."id")
		 FROM "med_order_form" f2
		 WHERE f2."name" = f."name" AND f2."deleted_at" IS NULL) AS "keep_id"
	FROM "med_order_form" f
) k
WHERE l."form_id" = k."old_id"
	AND k."keep_id" IS NOT NULL
	AND k."old_id" <> k."keep_id";

DELETE FROM "med_order_form" f
WHERE EXISTS (
		SELECT 1
		FROM "med_order_form" f2
		WHERE f2."name" = f."name"
			AND f2."deleted_at" IS NULL
			AND f2."id" < f."id"
	)
	AND f."deleted_at" IS NULL;

UPDATE "medication_order_line" l
SET "order_type_id" = k."keep_id"
FROM (
	SELECT t."id" AS "old_id",
		(SELECT MIN(t2."id")
		 FROM "med_order_order_type" t2
		 WHERE t2."name" = t."name" AND t2."deleted_at" IS NULL) AS "keep_id"
	FROM "med_order_order_type" t
) k
WHERE l."order_type_id" = k."old_id"
	AND k."keep_id" IS NOT NULL
	AND k."old_id" <> k."keep_id";

DELETE FROM "med_order_order_type" t
WHERE EXISTS (
		SELECT 1
		FROM "med_order_order_type" t2
		WHERE t2."name" = t."name"
			AND t2."deleted_at" IS NULL
			AND t2."id" < t."id"
	)
	AND t."deleted_at" IS NULL;

UPDATE "medication_order_line" l
SET "dose_unit_id" = k."keep_id"
FROM (
	SELECT d."id" AS "old_id",
		(SELECT MIN(d2."id")
		 FROM "med_order_dose_unit" d2
		 WHERE d2."name" = d."name" AND d2."deleted_at" IS NULL) AS "keep_id"
	FROM "med_order_dose_unit" d
) k
WHERE l."dose_unit_id" = k."old_id"
	AND k."keep_id" IS NOT NULL
	AND k."old_id" <> k."keep_id";

DELETE FROM "med_order_dose_unit" d
WHERE EXISTS (
		SELECT 1
		FROM "med_order_dose_unit" d2
		WHERE d2."name" = d."name"
			AND d2."deleted_at" IS NULL
			AND d2."id" < d."id"
	)
	AND d."deleted_at" IS NULL;

UPDATE "medication_order_line" l
SET "food_relation_id" = k."keep_id"
FROM (
	SELECT d."id" AS "old_id",
		(SELECT MIN(d2."id")
		 FROM "med_order_food_relation" d2
		 WHERE d2."name" = d."name" AND d2."deleted_at" IS NULL) AS "keep_id"
	FROM "med_order_food_relation" d
) k
WHERE l."food_relation_id" = k."old_id"
	AND k."keep_id" IS NOT NULL
	AND k."old_id" <> k."keep_id";

DELETE FROM "med_order_food_relation" f
WHERE EXISTS (
		SELECT 1
		FROM "med_order_food_relation" f2
		WHERE f2."name" = f."name"
			AND f2."deleted_at" IS NULL
			AND f2."id" < f."id"
	)
	AND f."deleted_at" IS NULL;

-- --- med_order_form
DROP INDEX IF EXISTS "med_order_form_hospital_id_idx";
ALTER TABLE "med_order_form" DROP CONSTRAINT IF EXISTS "med_order_form_hospital_id_hospital_id_fk";
ALTER TABLE "med_order_form" DROP COLUMN IF EXISTS "hospital_id";
ALTER TABLE "med_order_form" ADD COLUMN IF NOT EXISTS "is_preset" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "med_order_form_preset_idx"
	ON "med_order_form" ("is_preset")
	WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_form_preset_global_name_uidx"
	ON "med_order_form" ("name")
	WHERE "deleted_at" IS NULL
		AND "is_preset" = true;
CREATE TABLE IF NOT EXISTS "med_order_form_inactive" (
	"hospital_id" uuid NOT NULL,
	"form_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "med_order_form_inactive_hospital_id_hospital_id_fk"
		FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_form_inactive_form_id_med_order_form_id_fk"
		FOREIGN KEY ("form_id") REFERENCES "public"."med_order_form"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_form_inactive_created_by_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."user"("id")
		ON DELETE set null ON UPDATE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_form_inactive_hospital_form_uidx"
	ON "med_order_form_inactive" ("hospital_id", "form_id");
CREATE INDEX IF NOT EXISTS "med_order_form_inactive_hospital_id_idx"
	ON "med_order_form_inactive" ("hospital_id");
CREATE INDEX IF NOT EXISTS "med_order_form_inactive_form_id_idx"
	ON "med_order_form_inactive" ("form_id");

-- --- med_order_order_type
DROP INDEX IF EXISTS "med_order_order_type_hospital_id_idx";
ALTER TABLE "med_order_order_type" DROP CONSTRAINT IF EXISTS "med_order_order_type_hospital_id_hospital_id_fk";
ALTER TABLE "med_order_order_type" DROP COLUMN IF EXISTS "hospital_id";
ALTER TABLE "med_order_order_type" ADD COLUMN IF NOT EXISTS "is_preset" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "med_order_order_type_preset_idx"
	ON "med_order_order_type" ("is_preset")
	WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_order_type_preset_global_name_uidx"
	ON "med_order_order_type" ("name")
	WHERE "deleted_at" IS NULL
		AND "is_preset" = true;
CREATE TABLE IF NOT EXISTS "med_order_order_type_inactive" (
	"hospital_id" uuid NOT NULL,
	"order_type_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "med_order_order_type_inactive_hospital_id_hospital_id_fk"
		FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_order_type_inactive_order_type_id_med_order_order_type_id_fk"
		FOREIGN KEY ("order_type_id") REFERENCES "public"."med_order_order_type"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_order_type_inactive_created_by_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."user"("id")
		ON DELETE set null ON UPDATE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_order_type_inactive_hospital_type_uidx"
	ON "med_order_order_type_inactive" ("hospital_id", "order_type_id");
CREATE INDEX IF NOT EXISTS "med_order_order_type_inactive_hospital_id_idx"
	ON "med_order_order_type_inactive" ("hospital_id");
CREATE INDEX IF NOT EXISTS "med_order_order_type_inactive_order_type_id_idx"
	ON "med_order_order_type_inactive" ("order_type_id");

-- --- med_order_dose_unit
DROP INDEX IF EXISTS "med_order_dose_unit_hospital_id_idx";
ALTER TABLE "med_order_dose_unit" DROP CONSTRAINT IF EXISTS "med_order_dose_unit_hospital_id_hospital_id_fk";
ALTER TABLE "med_order_dose_unit" DROP COLUMN IF EXISTS "hospital_id";
ALTER TABLE "med_order_dose_unit" ADD COLUMN IF NOT EXISTS "is_preset" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "med_order_dose_unit_preset_idx"
	ON "med_order_dose_unit" ("is_preset")
	WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_dose_unit_preset_global_name_uidx"
	ON "med_order_dose_unit" ("name")
	WHERE "deleted_at" IS NULL
		AND "is_preset" = true;
CREATE TABLE IF NOT EXISTS "med_order_dose_unit_inactive" (
	"hospital_id" uuid NOT NULL,
	"dose_unit_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "med_order_dose_unit_inactive_hospital_id_hospital_id_fk"
		FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_dose_unit_inactive_dose_unit_id_med_order_dose_unit_id_fk"
		FOREIGN KEY ("dose_unit_id") REFERENCES "public"."med_order_dose_unit"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_dose_unit_inactive_created_by_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."user"("id")
		ON DELETE set null ON UPDATE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_dose_unit_inactive_hospital_dose_unit_uidx"
	ON "med_order_dose_unit_inactive" ("hospital_id", "dose_unit_id");
CREATE INDEX IF NOT EXISTS "med_order_dose_unit_inactive_hospital_id_idx"
	ON "med_order_dose_unit_inactive" ("hospital_id");
CREATE INDEX IF NOT EXISTS "med_order_dose_unit_inactive_dose_unit_id_idx"
	ON "med_order_dose_unit_inactive" ("dose_unit_id");

-- --- med_order_food_relation
DROP INDEX IF EXISTS "med_order_food_relation_hospital_id_idx";
ALTER TABLE "med_order_food_relation" DROP CONSTRAINT IF EXISTS "med_order_food_relation_hospital_id_hospital_id_fk";
ALTER TABLE "med_order_food_relation" DROP COLUMN IF EXISTS "hospital_id";
ALTER TABLE "med_order_food_relation" ADD COLUMN IF NOT EXISTS "is_preset" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "med_order_food_relation_preset_idx"
	ON "med_order_food_relation" ("is_preset")
	WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_food_relation_preset_global_name_uidx"
	ON "med_order_food_relation" ("name")
	WHERE "deleted_at" IS NULL
		AND "is_preset" = true;
CREATE TABLE IF NOT EXISTS "med_order_food_relation_inactive" (
	"hospital_id" uuid NOT NULL,
	"food_relation_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "med_order_food_relation_inactive_hospital_id_hospital_id_fk"
		FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_food_relation_inactive_food_id_med_order_food_relation_id_fk"
		FOREIGN KEY ("food_relation_id") REFERENCES "public"."med_order_food_relation"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_food_relation_inactive_created_by_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."user"("id")
		ON DELETE set null ON UPDATE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_food_relation_inactive_hospital_food_uidx"
	ON "med_order_food_relation_inactive" ("hospital_id", "food_relation_id");
CREATE INDEX IF NOT EXISTS "med_order_food_relation_inactive_hospital_id_idx"
	ON "med_order_food_relation_inactive" ("hospital_id");
CREATE INDEX IF NOT EXISTS "med_order_food_relation_inactive_food_relation_id_idx"
	ON "med_order_food_relation_inactive" ("food_relation_id");

-- --- med_order_duration_unit
DROP INDEX IF EXISTS "med_order_duration_unit_hospital_id_idx";
DROP INDEX IF EXISTS "med_order_duration_unit_hospital_code_uidx";
DROP INDEX IF EXISTS "med_order_duration_unit_global_code_uidx";
ALTER TABLE "med_order_duration_unit" DROP CONSTRAINT IF EXISTS "med_order_duration_unit_hospital_id_hospital_id_fk";
ALTER TABLE "med_order_duration_unit" DROP COLUMN IF EXISTS "hospital_id";
ALTER TABLE "med_order_duration_unit" ADD COLUMN IF NOT EXISTS "is_preset" boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_duration_unit_global_code_uidx"
	ON "med_order_duration_unit" ("code")
	WHERE "deleted_at" IS NULL;
CREATE INDEX IF NOT EXISTS "med_order_duration_unit_preset_idx"
	ON "med_order_duration_unit" ("is_preset")
	WHERE "deleted_at" IS NULL;
CREATE TABLE IF NOT EXISTS "med_order_duration_unit_inactive" (
	"hospital_id" uuid NOT NULL,
	"duration_unit_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "med_order_duration_unit_inactive_hospital_id_hospital_id_fk"
		FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_duration_unit_inactive_unit_id_fk"
		FOREIGN KEY ("duration_unit_id") REFERENCES "med_order_duration_unit"("id")
		ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_duration_unit_inactive_created_by_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."user"("id")
		ON DELETE set null ON UPDATE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_duration_unit_inactive_hospital_unit_uidx"
	ON "med_order_duration_unit_inactive" ("hospital_id", "duration_unit_id");
CREATE INDEX IF NOT EXISTS "med_order_duration_unit_inactive_hospital_id_idx"
	ON "med_order_duration_unit_inactive" ("hospital_id");
CREATE INDEX IF NOT EXISTS "med_order_duration_unit_inactive_duration_unit_id_idx"
	ON "med_order_duration_unit_inactive" ("duration_unit_id");

-- Mark canonical duration units as presets after column add (merged rows from 0038 per-hospital seed)
UPDATE "med_order_duration_unit"
SET "is_preset" = true
WHERE "code" IN ('minute', 'hour', 'day', 'week', 'month')
	AND "deleted_at" IS NULL;
