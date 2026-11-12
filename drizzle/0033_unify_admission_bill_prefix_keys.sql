-- Unify visit / IPD admission prefix keys → ADMISSION_NO; IP bill → BILL_NO.

UPDATE "prefix_format"
SET "key" = 'ADMISSION_NO'
WHERE "key" IN ('VISIT_NO', 'IPD_ADMISSION_NO')
	AND "deleted_at" IS NULL;

-- If both legacy rows existed for one hospital, keep the lowest id and soft-delete duplicates.
UPDATE "prefix_format" AS pf
SET "deleted_at" = NOW()
WHERE pf."key" = 'ADMISSION_NO'
	AND pf."deleted_at" IS NULL
	AND pf."id" NOT IN (
		SELECT MIN(pf2."id")
		FROM "prefix_format" AS pf2
		WHERE pf2."hospital_id" = pf."hospital_id"
			AND pf2."key" = 'ADMISSION_NO'
			AND pf2."deleted_at" IS NULL
		GROUP BY pf2."hospital_id"
	);

UPDATE "prefix_format"
SET "key" = 'BILL_NO'
WHERE "key" = 'IP_BILL_NO'
	AND "deleted_at" IS NULL;

UPDATE "prefix_counter"
SET
	"key" = 'ADMISSION_NO',
	"scope_key" = REPLACE("scope_key", 'VISIT_NO', 'ADMISSION_NO')
WHERE "key" = 'VISIT_NO';

UPDATE "prefix_counter"
SET
	"key" = 'ADMISSION_NO',
	"scope_key" = REPLACE("scope_key", 'IPD_ADMISSION_NO', 'ADMISSION_NO')
WHERE "key" = 'IPD_ADMISSION_NO';

UPDATE "prefix_counter"
SET
	"key" = 'BILL_NO',
	"scope_key" = REPLACE("scope_key", 'IP_BILL_NO', 'BILL_NO')
WHERE "key" = 'IP_BILL_NO';
