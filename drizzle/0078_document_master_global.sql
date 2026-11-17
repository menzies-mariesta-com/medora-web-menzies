ALTER TABLE "document" DROP CONSTRAINT IF EXISTS "document_hospital_id_hospital_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "document_hospital_id_idx";
--> statement-breakpoint
ALTER TABLE "document" DROP COLUMN IF EXISTS "hospital_id";
