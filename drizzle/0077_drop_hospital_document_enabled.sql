ALTER TABLE "hospital_document" DROP CONSTRAINT IF EXISTS "hospital_document_template_enabled_by_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "hospital_document" DROP CONSTRAINT IF EXISTS "hospital_document_enabled_by_staff_id_fk";
--> statement-breakpoint
ALTER TABLE "hospital_document" DROP COLUMN IF EXISTS "enabled_by";
--> statement-breakpoint
ALTER TABLE "hospital_document" DROP COLUMN IF EXISTS "enabled_at";
