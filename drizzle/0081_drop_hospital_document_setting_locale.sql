ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "locale" varchar(16) DEFAULT 'en' NOT NULL;
--> statement-breakpoint
UPDATE "hospital_document" hd
SET "locale" = hds."default_catalog_locale"
FROM "hospital_document_setting" hds
WHERE hds."hospital_id" = hd."hospital_id"
	AND hds."default_catalog_locale" IS NOT NULL;
--> statement-breakpoint
DROP TABLE IF EXISTS "hospital_document_setting";
