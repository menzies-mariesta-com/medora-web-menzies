-- PR: explicit from/to store; drop store.is_central_store (GRN uses PR.to_store_id)

ALTER TABLE "purchase_requisition" ADD COLUMN IF NOT EXISTS "from_store_id" integer;
ALTER TABLE "purchase_requisition" ADD COLUMN IF NOT EXISTS "to_store_id" integer;

-- Backfill from_store_id = old store_id; to_store_id = branch central when present
UPDATE "purchase_requisition" pr
SET
	"from_store_id" = pr."store_id",
	"to_store_id" = c."id"
FROM "store" s
LEFT JOIN "store" c ON c."branch_id" = s."branch_id" AND c."is_central_store" = true
WHERE pr."store_id" = s."id"
	AND pr."from_store_id" IS NULL;

-- No central: pick another store in same branch (distinct from from)
UPDATE "purchase_requisition" pr
SET "to_store_id" = alt."id"
FROM "store" sfrom
CROSS JOIN LATERAL (
	SELECT s2."id"
	FROM "store" s2
	WHERE s2."branch_id" = sfrom."branch_id"
		AND s2."id" <> pr."from_store_id"
	ORDER BY s2."id"
	LIMIT 1
) alt
WHERE pr."to_store_id" IS NULL
	AND sfrom."id" = pr."from_store_id";

DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "purchase_requisition" WHERE "to_store_id" IS NULL
	) THEN
		RAISE EXCEPTION 'Migration 0038: purchase_requisition rows need to_store_id; add another store per branch or set manually';
	END IF;
END $$;

ALTER TABLE "purchase_requisition" DROP CONSTRAINT IF EXISTS "purchase_requisition_store_id_store_id_fk";
DROP INDEX IF EXISTS "purchase_requisition_hospital_store_idx";

ALTER TABLE "purchase_requisition" ALTER COLUMN "from_store_id" SET NOT NULL;
ALTER TABLE "purchase_requisition" ALTER COLUMN "to_store_id" SET NOT NULL;

ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_from_store_id_store_id_fk" FOREIGN KEY ("from_store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_to_store_id_store_id_fk" FOREIGN KEY ("to_store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;

ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_from_to_distinct_chk" CHECK ("from_store_id" <> "to_store_id");

ALTER TABLE "purchase_requisition" DROP COLUMN "store_id";

CREATE INDEX IF NOT EXISTS "purchase_requisition_hospital_from_store_idx" ON "purchase_requisition" ("hospital_id", "from_store_id");
CREATE INDEX IF NOT EXISTS "purchase_requisition_hospital_to_store_idx" ON "purchase_requisition" ("hospital_id", "to_store_id");

DROP INDEX IF EXISTS "store_branch_central_unique";
ALTER TABLE "store" DROP COLUMN IF EXISTS "is_central_store";
