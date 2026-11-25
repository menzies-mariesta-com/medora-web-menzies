-- Replace the `is_er` boolean with a `care_setting` enum column (IPD / ED / ICU / OT)
-- on ward_category, room_category, ward, room, bed, and move `ot_room` into `room`.

-- 1. Add care_setting alongside is_er, carrying the old flag across.
ALTER TABLE "ward_category" ADD COLUMN IF NOT EXISTS "care_setting" varchar(8) NOT NULL DEFAULT 'IPD';
ALTER TABLE "room_category" ADD COLUMN IF NOT EXISTS "care_setting" varchar(8) NOT NULL DEFAULT 'IPD';
ALTER TABLE "ward" ADD COLUMN IF NOT EXISTS "care_setting" varchar(8) NOT NULL DEFAULT 'IPD';
ALTER TABLE "room" ADD COLUMN IF NOT EXISTS "care_setting" varchar(8) NOT NULL DEFAULT 'IPD';
ALTER TABLE "bed" ADD COLUMN IF NOT EXISTS "care_setting" varchar(8) NOT NULL DEFAULT 'IPD';

DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'ward_category' AND column_name = 'is_er'
	) THEN
		EXECUTE 'UPDATE "ward_category" SET "care_setting" = ''ED'' WHERE "is_er" = true';
		EXECUTE 'UPDATE "room_category" SET "care_setting" = ''ED'' WHERE "is_er" = true';
		EXECUTE 'UPDATE "ward" SET "care_setting" = ''ED'' WHERE "is_er" = true';
		EXECUTE 'UPDATE "room" SET "care_setting" = ''ED'' WHERE "is_er" = true';
		EXECUTE 'UPDATE "bed" SET "care_setting" = ''ED'' WHERE "is_er" = true';
	END IF;
END $$;

-- 2. OT rooms live in the unified master from now on: one OT ward + room
--    category per branch that has (or had) an ot_room, then copy the rooms in.
DO $$
DECLARE
	branch RECORD;
	ot_ward_category_id integer;
	ot_room_category_id integer;
	ot_ward_id integer;
BEGIN
	IF to_regclass('public.ot_room') IS NULL THEN
		RETURN;
	END IF;

	FOR branch IN
		SELECT DISTINCT o.hospital_id, o.branch_id
		FROM "ot_room" o
		WHERE o.branch_id IS NOT NULL
	LOOP
		SELECT id INTO ot_ward_category_id
		FROM "ward_category"
		WHERE hospital_id = branch.hospital_id AND care_setting = 'OT' AND code = 'OT-CAT'
		LIMIT 1;
		IF ot_ward_category_id IS NULL THEN
			INSERT INTO "ward_category" (hospital_id, name, code, ward_markup, care_setting, status_id)
			VALUES (branch.hospital_id, 'Operating Theatre', 'OT-CAT', '0', 'OT', 1)
			RETURNING id INTO ot_ward_category_id;
		END IF;

		SELECT id INTO ot_room_category_id
		FROM "room_category"
		WHERE hospital_id = branch.hospital_id AND care_setting = 'OT' AND code = 'OT-RC'
		LIMIT 1;
		IF ot_room_category_id IS NULL THEN
			INSERT INTO "room_category" (hospital_id, name, code, room_markup, care_setting, status_id)
			VALUES (branch.hospital_id, 'Operating Theatre', 'OT-RC', '0', 'OT', 1)
			RETURNING id INTO ot_room_category_id;
		END IF;

		SELECT id INTO ot_ward_id
		FROM "ward"
		WHERE hospital_id = branch.hospital_id AND branch_id = branch.branch_id AND code = 'OT-WARD'
		LIMIT 1;
		IF ot_ward_id IS NULL THEN
			INSERT INTO "ward" (hospital_id, branch_id, ward_category_id, name, code, care_setting, status_id)
			VALUES (branch.hospital_id, branch.branch_id, ot_ward_category_id, 'Operating Theatre', 'OT-WARD', 'OT', 1)
			RETURNING id INTO ot_ward_id;
		END IF;

		INSERT INTO "room" (hospital_id, ward_id, room_category_id, name, capacity, care_setting, status_id, created_at, updated_at)
		SELECT
			o.hospital_id,
			ot_ward_id,
			ot_room_category_id,
			o.name,
			0,
			'OT',
			o.status_id,
			o.created_at,
			o.updated_at
		FROM "ot_room" o
		WHERE o.hospital_id = branch.hospital_id
			AND o.branch_id = branch.branch_id
			AND NOT EXISTS (
				SELECT 1 FROM "room" r
				WHERE r.hospital_id = o.hospital_id
					AND r.ward_id = ot_ward_id
					AND r.name = o.name
					AND r.care_setting = 'OT'
			);

		UPDATE "surgical_case" sc
		SET "ot_room_id" = r.id
		FROM "ot_room" o
		INNER JOIN "room" r
			ON r.hospital_id = o.hospital_id
			AND r.ward_id = ot_ward_id
			AND r.name = o.name
			AND r.care_setting = 'OT'
		WHERE sc."ot_room_id" = o.id
			AND o.hospital_id = branch.hospital_id
			AND o.branch_id = branch.branch_id;
	END LOOP;
END $$;

ALTER TABLE "surgical_case" DROP CONSTRAINT IF EXISTS "surgical_case_ot_room_id_ot_room_id_fk";
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "ot_room_ref" integer REFERENCES "room"("id") ON DELETE SET NULL;
UPDATE "surgical_case" SET "ot_room_ref" = "ot_room_id" WHERE "ot_room_id" IS NOT NULL;
ALTER TABLE "surgical_case" DROP COLUMN IF EXISTS "ot_room_id";
ALTER TABLE "surgical_case" RENAME COLUMN "ot_room_ref" TO "ot_room_id";
CREATE INDEX IF NOT EXISTS "surgical_case_room_schedule_idx" ON "surgical_case" ("ot_room_id", "scheduled_start");

DROP TABLE IF EXISTS "ot_room" CASCADE;

-- 3. Enforce the allowed values, then drop the old flag.
ALTER TABLE "ward_category" DROP CONSTRAINT IF EXISTS "ward_category_care_setting_check";
ALTER TABLE "ward_category" ADD CONSTRAINT "ward_category_care_setting_check" CHECK ("care_setting" IN ('IPD', 'ED', 'ICU', 'OT'));
ALTER TABLE "room_category" DROP CONSTRAINT IF EXISTS "room_category_care_setting_check";
ALTER TABLE "room_category" ADD CONSTRAINT "room_category_care_setting_check" CHECK ("care_setting" IN ('IPD', 'ED', 'ICU', 'OT'));
ALTER TABLE "ward" DROP CONSTRAINT IF EXISTS "ward_care_setting_check";
ALTER TABLE "ward" ADD CONSTRAINT "ward_care_setting_check" CHECK ("care_setting" IN ('IPD', 'ED', 'ICU', 'OT'));
ALTER TABLE "room" DROP CONSTRAINT IF EXISTS "room_care_setting_check";
ALTER TABLE "room" ADD CONSTRAINT "room_care_setting_check" CHECK ("care_setting" IN ('IPD', 'ED', 'ICU', 'OT'));
ALTER TABLE "bed" DROP CONSTRAINT IF EXISTS "bed_care_setting_check";
ALTER TABLE "bed" ADD CONSTRAINT "bed_care_setting_check" CHECK ("care_setting" IN ('IPD', 'ED', 'ICU', 'OT'));

ALTER TABLE "ward_category" DROP COLUMN IF EXISTS "is_er";
ALTER TABLE "room_category" DROP COLUMN IF EXISTS "is_er";
ALTER TABLE "ward" DROP COLUMN IF EXISTS "is_er";
ALTER TABLE "room" DROP COLUMN IF EXISTS "is_er";
ALTER TABLE "bed" DROP COLUMN IF EXISTS "is_er";

-- 4. Retire the Emergency registration + ED bed-status pages from the nav.
--    Rows are kept (user_group_page grants reference these ids); only status changes.
UPDATE "page" SET status_id = 2 WHERE id IN (1200100, 1200101, 1200102, 1200200);
