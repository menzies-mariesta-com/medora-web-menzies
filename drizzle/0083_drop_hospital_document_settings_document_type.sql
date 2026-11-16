-- Layout presets are hospital-scoped only; type lives on hospital_document (0067 dropped this from document_setting).
ALTER TABLE "hospital_document_settings" DROP CONSTRAINT IF EXISTS "document_setting_document_type_id_document_type_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "document_setting_document_type_id_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "hospital_document_settings_document_type_id_idx";
--> statement-breakpoint
ALTER TABLE "hospital_document_settings" DROP COLUMN IF EXISTS "document_type_id";