-- Merge er_ward_category / er_room_category / er_ward / er_room / er_bed into master tables (is_er flag).

ALTER TABLE "ward_category" ADD COLUMN IF NOT EXISTS "is_er" boolean DEFAULT false NOT NULL;
ALTER TABLE "room_category" ADD COLUMN IF NOT EXISTS "is_er" boolean DEFAULT false NOT NULL;
ALTER TABLE "ward" ADD COLUMN IF NOT EXISTS "is_er" boolean DEFAULT false NOT NULL;
ALTER TABLE "room" ADD COLUMN IF NOT EXISTS "is_er" boolean DEFAULT false NOT NULL;
ALTER TABLE "bed" ADD COLUMN IF NOT EXISTS "is_er" boolean DEFAULT false NOT NULL;

DROP TABLE IF EXISTS "_er_master_migrate_map";

CREATE TABLE "_er_master_migrate_map" (
	"entity" varchar(32) NOT NULL,
	"old_id" integer NOT NULL,
	"new_id" integer NOT NULL,
	CONSTRAINT "_er_master_migrate_map_pkey" PRIMARY KEY ("entity", "old_id")
);

DO $$
BEGIN
	IF to_regclass('public.er_ward_category') IS NULL THEN
		RETURN;
	END IF;

	TRUNCATE "_er_master_migrate_map";

	INSERT INTO "ward_category" (
		"hospital_id", "name", "code", "ward_markup", "status_id", "is_er", "created_at", "updated_at"
	)
	SELECT
		e."hospital_id",
		e."name",
		e."code",
		e."ward_markup",
		e."status_id",
		true,
		e."created_at",
		e."updated_at"
	FROM "er_ward_category" e
	WHERE NOT EXISTS (
		SELECT 1
		FROM "ward_category" w
		WHERE w."is_er" = true
			AND w."hospital_id" = e."hospital_id"
			AND w."name" = e."name"
			AND (w."code" IS NOT DISTINCT FROM e."code")
			AND w."created_at" = e."created_at"
	);

	INSERT INTO "_er_master_migrate_map" ("entity", "old_id", "new_id")
	SELECT DISTINCT ON (e."id")
		'ward_category',
		e."id",
		w."id"
	FROM "er_ward_category" e
	INNER JOIN "ward_category" w
		ON w."is_er" = true
		AND w."hospital_id" = e."hospital_id"
		AND w."name" = e."name"
		AND (w."code" IS NOT DISTINCT FROM e."code")
		AND w."created_at" = e."created_at"
	ORDER BY e."id", w."id"
	ON CONFLICT ("entity", "old_id") DO UPDATE SET "new_id" = EXCLUDED."new_id";

	INSERT INTO "room_category" (
		"hospital_id", "name", "code", "room_markup", "status_id", "is_er", "created_at", "updated_at"
	)
	SELECT
		e."hospital_id",
		e."name",
		e."code",
		e."room_markup",
		e."status_id",
		true,
		e."created_at",
		e."updated_at"
	FROM "er_room_category" e
	WHERE NOT EXISTS (
		SELECT 1
		FROM "room_category" w
		WHERE w."is_er" = true
			AND w."hospital_id" = e."hospital_id"
			AND w."name" = e."name"
			AND (w."code" IS NOT DISTINCT FROM e."code")
			AND w."created_at" = e."created_at"
	);

	INSERT INTO "_er_master_migrate_map" ("entity", "old_id", "new_id")
	SELECT DISTINCT ON (e."id")
		'room_category',
		e."id",
		w."id"
	FROM "er_room_category" e
	INNER JOIN "room_category" w
		ON w."is_er" = true
		AND w."hospital_id" = e."hospital_id"
		AND w."name" = e."name"
		AND (w."code" IS NOT DISTINCT FROM e."code")
		AND w."created_at" = e."created_at"
	ORDER BY e."id", w."id"
	ON CONFLICT ("entity", "old_id") DO UPDATE SET "new_id" = EXCLUDED."new_id";

	INSERT INTO "ward" (
		"hospital_id",
		"branch_id",
		"ward_category_id",
		"name",
		"code",
		"status_id",
		"is_er",
		"created_at",
		"updated_at"
	)
	SELECT
		e."hospital_id",
		e."branch_id",
		m."new_id",
		e."name",
		e."code",
		e."status_id",
		true,
		e."created_at",
		e."updated_at"
	FROM "er_ward" e
	INNER JOIN "_er_master_migrate_map" m
		ON m."entity" = 'ward_category'
		AND m."old_id" = e."er_ward_category_id"
	WHERE NOT EXISTS (
		SELECT 1
		FROM "ward" w
		WHERE w."is_er" = true
			AND w."hospital_id" = e."hospital_id"
			AND w."branch_id" = e."branch_id"
			AND w."ward_category_id" = m."new_id"
			AND w."name" = e."name"
			AND (w."code" IS NOT DISTINCT FROM e."code")
			AND w."created_at" = e."created_at"
	);

	INSERT INTO "_er_master_migrate_map" ("entity", "old_id", "new_id")
	SELECT DISTINCT ON (e."id")
		'ward',
		e."id",
		w."id"
	FROM "er_ward" e
	INNER JOIN "_er_master_migrate_map" m
		ON m."entity" = 'ward_category'
		AND m."old_id" = e."er_ward_category_id"
	INNER JOIN "ward" w
		ON w."is_er" = true
		AND w."hospital_id" = e."hospital_id"
		AND w."branch_id" = e."branch_id"
		AND w."ward_category_id" = m."new_id"
		AND w."name" = e."name"
		AND (w."code" IS NOT DISTINCT FROM e."code")
		AND w."created_at" = e."created_at"
	ORDER BY e."id", w."id"
	ON CONFLICT ("entity", "old_id") DO UPDATE SET "new_id" = EXCLUDED."new_id";

	INSERT INTO "room" (
		"hospital_id",
		"ward_id",
		"room_category_id",
		"name",
		"code",
		"capacity",
		"amenities",
		"status_id",
		"is_er",
		"created_at",
		"updated_at"
	)
	SELECT
		e."hospital_id",
		wm."new_id",
		rcm."new_id",
		e."name",
		e."code",
		e."capacity",
		e."amenities",
		e."status_id",
		true,
		e."created_at",
		e."updated_at"
	FROM "er_room" e
	INNER JOIN "_er_master_migrate_map" wm
		ON wm."entity" = 'ward'
		AND wm."old_id" = e."er_ward_id"
	INNER JOIN "_er_master_migrate_map" rcm
		ON rcm."entity" = 'room_category'
		AND rcm."old_id" = e."er_room_category_id"
	WHERE NOT EXISTS (
		SELECT 1
		FROM "room" r
		WHERE r."is_er" = true
			AND r."hospital_id" = e."hospital_id"
			AND r."ward_id" = wm."new_id"
			AND r."room_category_id" = rcm."new_id"
			AND r."name" = e."name"
			AND (r."code" IS NOT DISTINCT FROM e."code")
			AND r."created_at" = e."created_at"
	);

	INSERT INTO "_er_master_migrate_map" ("entity", "old_id", "new_id")
	SELECT DISTINCT ON (e."id")
		'room',
		e."id",
		r."id"
	FROM "er_room" e
	INNER JOIN "_er_master_migrate_map" wm
		ON wm."entity" = 'ward'
		AND wm."old_id" = e."er_ward_id"
	INNER JOIN "_er_master_migrate_map" rcm
		ON rcm."entity" = 'room_category'
		AND rcm."old_id" = e."er_room_category_id"
	INNER JOIN "room" r
		ON r."is_er" = true
		AND r."hospital_id" = e."hospital_id"
		AND r."ward_id" = wm."new_id"
		AND r."room_category_id" = rcm."new_id"
		AND r."name" = e."name"
		AND (r."code" IS NOT DISTINCT FROM e."code")
		AND r."created_at" = e."created_at"
	ORDER BY e."id", r."id"
	ON CONFLICT ("entity", "old_id") DO UPDATE SET "new_id" = EXCLUDED."new_id";

	INSERT INTO "bed" (
		"room_id",
		"hospital_id",
		"name",
		"code",
		"base_price",
		"bed_status",
		"status_id",
		"is_er",
		"created_at",
		"updated_at"
	)
	SELECT
		rm."new_id",
		e."hospital_id",
		e."name",
		e."code",
		e."base_price",
		e."bed_status",
		e."status_id",
		true,
		e."created_at",
		e."updated_at"
	FROM "er_bed" e
	INNER JOIN "_er_master_migrate_map" rm
		ON rm."entity" = 'room'
		AND rm."old_id" = e."er_room_id"
	WHERE NOT EXISTS (
		SELECT 1
		FROM "bed" b
		WHERE b."is_er" = true
			AND b."hospital_id" = e."hospital_id"
			AND b."room_id" = rm."new_id"
			AND b."name" = e."name"
			AND (b."code" IS NOT DISTINCT FROM e."code")
			AND b."created_at" = e."created_at"
	);

	INSERT INTO "_er_master_migrate_map" ("entity", "old_id", "new_id")
	SELECT DISTINCT ON (e."id")
		'bed',
		e."id",
		b."id"
	FROM "er_bed" e
	INNER JOIN "_er_master_migrate_map" rm
		ON rm."entity" = 'room'
		AND rm."old_id" = e."er_room_id"
	INNER JOIN "bed" b
		ON b."is_er" = true
		AND b."hospital_id" = e."hospital_id"
		AND b."room_id" = rm."new_id"
		AND b."name" = e."name"
		AND (b."code" IS NOT DISTINCT FROM e."code")
		AND b."created_at" = e."created_at"
	ORDER BY e."id", b."id"
	ON CONFLICT ("entity", "old_id") DO UPDATE SET "new_id" = EXCLUDED."new_id";

	UPDATE "ed_encounter" enc
	SET "er_ward_id" = m."new_id"
	FROM "_er_master_migrate_map" m
	WHERE m."entity" = 'ward'
		AND m."old_id" = enc."er_ward_id"
		AND enc."er_ward_id" IS NOT NULL;

	UPDATE "ed_encounter" enc
	SET "er_room_id" = m."new_id"
	FROM "_er_master_migrate_map" m
	WHERE m."entity" = 'room'
		AND m."old_id" = enc."er_room_id"
		AND enc."er_room_id" IS NOT NULL;

	UPDATE "ed_encounter" enc
	SET "er_bed_id" = m."new_id"
	FROM "_er_master_migrate_map" m
	WHERE m."entity" = 'bed'
		AND m."old_id" = enc."er_bed_id"
		AND enc."er_bed_id" IS NOT NULL;
END $$;

ALTER TABLE "ed_encounter" DROP CONSTRAINT IF EXISTS "ed_encounter_er_ward_id_er_ward_id_fk";
ALTER TABLE "ed_encounter" DROP CONSTRAINT IF EXISTS "ed_encounter_er_room_id_er_room_id_fk";
ALTER TABLE "ed_encounter" DROP CONSTRAINT IF EXISTS "ed_encounter_er_bed_id_er_bed_id_fk";

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'ed_encounter_er_ward_id_ward_id_fk'
	) THEN
		ALTER TABLE "ed_encounter"
			ADD CONSTRAINT "ed_encounter_er_ward_id_ward_id_fk"
			FOREIGN KEY ("er_ward_id") REFERENCES "public"."ward"("id") ON DELETE set null ON UPDATE no action;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'ed_encounter_er_room_id_room_id_fk'
	) THEN
		ALTER TABLE "ed_encounter"
			ADD CONSTRAINT "ed_encounter_er_room_id_room_id_fk"
			FOREIGN KEY ("er_room_id") REFERENCES "public"."room"("id") ON DELETE set null ON UPDATE no action;
	END IF;
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'ed_encounter_er_bed_id_bed_id_fk'
	) THEN
		ALTER TABLE "ed_encounter"
			ADD CONSTRAINT "ed_encounter_er_bed_id_bed_id_fk"
			FOREIGN KEY ("er_bed_id") REFERENCES "public"."bed"("id") ON DELETE set null ON UPDATE no action;
	END IF;
END $$;

DROP TABLE IF EXISTS "er_bed" CASCADE;
DROP TABLE IF EXISTS "er_room" CASCADE;
DROP TABLE IF EXISTS "er_ward" CASCADE;
DROP TABLE IF EXISTS "er_room_category" CASCADE;
DROP TABLE IF EXISTS "er_ward_category" CASCADE;
DROP TABLE IF EXISTS "_er_master_migrate_map";

SELECT setval(
	pg_get_serial_sequence('ward_category', 'id'),
	GREATEST(COALESCE((SELECT MAX(id) FROM ward_category), 0), 1)
);
SELECT setval(
	pg_get_serial_sequence('room_category', 'id'),
	GREATEST(COALESCE((SELECT MAX(id) FROM room_category), 0), 1)
);
SELECT setval(
	pg_get_serial_sequence('ward', 'id'),
	GREATEST(COALESCE((SELECT MAX(id) FROM ward), 0), 1)
);
SELECT setval(
	pg_get_serial_sequence('room', 'id'),
	GREATEST(COALESCE((SELECT MAX(id) FROM room), 0), 1)
);
SELECT setval(
	pg_get_serial_sequence('bed', 'id'),
	GREATEST(COALESCE((SELECT MAX(id) FROM bed), 0), 1)
);
