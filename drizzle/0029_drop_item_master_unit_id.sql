-- Item master no longer stores a single "default" unit; conversions use item_unit_master / junction.
ALTER TABLE "item_master" DROP COLUMN IF EXISTS "unit_id";
