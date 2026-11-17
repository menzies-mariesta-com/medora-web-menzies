DO $$
BEGIN
	IF to_regclass('public.document_setting') IS NOT NULL THEN
		ALTER TABLE "document_setting" RENAME TO "hospital_document_settings";
	END IF;
END $$;
--> statement-breakpoint
ALTER INDEX IF EXISTS "document_setting_name_idx" RENAME TO "hospital_document_settings_name_idx";
--> statement-breakpoint
ALTER INDEX IF EXISTS "document_setting_document_id_uidx" RENAME TO "hospital_document_settings_document_id_uidx";
--> statement-breakpoint
ALTER INDEX IF EXISTS "document_setting_hospital_id_idx" RENAME TO "hospital_document_settings_hospital_id_idx";
--> statement-breakpoint
ALTER INDEX IF EXISTS "document_setting_status_id_idx" RENAME TO "hospital_document_settings_status_id_idx";
