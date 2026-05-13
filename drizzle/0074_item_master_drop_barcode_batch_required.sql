DROP INDEX IF EXISTS "item_master_hospital_barcode_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "item_master_barcode_idx";--> statement-breakpoint
ALTER TABLE "item_master" DROP COLUMN IF EXISTS "barcode";--> statement-breakpoint
ALTER TABLE "item_master" DROP COLUMN IF EXISTS "is_batch_required";
