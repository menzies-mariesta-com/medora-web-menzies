-- Hospital-scoped departments: enrich hospital_department, repoint staff, drop global department.

ALTER TABLE "hospital_department" ADD COLUMN IF NOT EXISTS "name" varchar(512);
ALTER TABLE "hospital_department" ADD COLUMN IF NOT EXISTS "code" varchar(128);
ALTER TABLE "hospital_department" ADD COLUMN IF NOT EXISTS "status_id" integer DEFAULT 1 NOT NULL;

UPDATE "hospital_department" AS hd
SET
	"name" = d."name",
	"code" = d."code",
	"status_id" = d."status_id"
FROM "department" AS d
WHERE hd."department_id" = d."id"
	AND hd."name" IS NULL;

-- New rows no longer use legacy department_id; allow NULL before seeding per hospital.
ALTER TABLE "hospital_department" ALTER COLUMN "department_id" DROP NOT NULL;

INSERT INTO "hospital_department" ("hospital_id", "name", "code", "status_id")
SELECT h."id", d."name", d."code", d."status_id"
FROM "hospital" AS h
CROSS JOIN "department" AS d
WHERE NOT EXISTS (
	SELECT 1
	FROM "hospital_department" AS hd
	WHERE hd."hospital_id" = h."id"
		AND hd."code" IS NOT DISTINCT FROM d."code"
		AND hd."name" IS NOT DISTINCT FROM d."name"
);

ALTER TABLE "staff_department" ADD COLUMN IF NOT EXISTS "hospital_department_id" integer;

UPDATE "staff_department" AS sd
SET "hospital_department_id" = sub."hd_id"
FROM (
	SELECT
		sd2."id" AS sd_id,
		(
			SELECT hd."id"
			FROM "hospital_department" AS hd
			INNER JOIN "staff_hospital" AS sh
				ON sh."staff_id" = sd2."staff_id"
				AND sh."hospital_id" = hd."hospital_id"
			INNER JOIN "department" AS d ON d."id" = sd2."department_id"
			WHERE hd."code" IS NOT DISTINCT FROM d."code"
				AND hd."name" IS NOT DISTINCT FROM d."name"
			ORDER BY hd."id"
			LIMIT 1
		) AS hd_id
	FROM "staff_department" AS sd2
) AS sub
WHERE sd."id" = sub."sd_id"
	AND sub."hd_id" IS NOT NULL;

DELETE FROM "staff_department" WHERE "hospital_department_id" IS NULL;

ALTER TABLE "staff_department" DROP CONSTRAINT IF EXISTS "staff_department_department_id_department_id_fk";
ALTER TABLE "staff_department" DROP COLUMN IF EXISTS "department_id";
ALTER TABLE "staff_department" ALTER COLUMN "hospital_department_id" SET NOT NULL;
ALTER TABLE "staff_department" ADD CONSTRAINT "staff_department_hospital_department_id_hospital_department_id_fk"
	FOREIGN KEY ("hospital_department_id") REFERENCES "public"."hospital_department"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "hospital_department" DROP CONSTRAINT IF EXISTS "hospital_department_department_id_department_id_fk";
ALTER TABLE "hospital_department" DROP COLUMN IF EXISTS "department_id";

ALTER TABLE "hospital_department" ADD CONSTRAINT "hospital_department_status_id_status_id_fk"
	FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "hospital_department_hospital_id_idx" ON "hospital_department" USING btree ("hospital_id");
CREATE INDEX IF NOT EXISTS "hospital_department_name_idx" ON "hospital_department" USING btree ("name");
CREATE INDEX IF NOT EXISTS "hospital_department_code_idx" ON "hospital_department" USING btree ("code");
CREATE INDEX IF NOT EXISTS "hospital_department_status_id_idx" ON "hospital_department" USING btree ("status_id");

CREATE UNIQUE INDEX IF NOT EXISTS "hospital_department_hospital_code_unique"
	ON "hospital_department" ("hospital_id", "code");

DROP TABLE IF EXISTS "department";
