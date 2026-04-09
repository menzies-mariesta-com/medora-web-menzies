-- Item Unit Master: unit conversion only (remove item tagging)
-- Drops item_master_id and redefines uniqueness by (hospital, purchase_unit, issue_unit).

-- Drop old unique index first (depends on item_master_id)
DROP INDEX IF EXISTS "item_unit_master_hospital_item_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "item_unit_master_item_master_id_idx";
--> statement-breakpoint

-- Drop FK constraint to item_master, then drop the column
ALTER TABLE "item_unit_master"
	DROP CONSTRAINT IF EXISTS "item_unit_master_item_master_id_item_master_id_fk";
--> statement-breakpoint
ALTER TABLE "item_unit_master"
	DROP COLUMN IF EXISTS "item_master_id";
--> statement-breakpoint

-- New uniqueness: one conversion definition per (purchase unit, issue unit) per hospital
CREATE UNIQUE INDEX IF NOT EXISTS "item_unit_master_hospital_units_unique"
	ON "item_unit_master" ("hospital_id", "purchase_unit_id", "issue_unit_id")
	WHERE "deleted_at" IS NULL;

