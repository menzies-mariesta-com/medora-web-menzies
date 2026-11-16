ALTER TABLE hospital_document_template DROP COLUMN IF EXISTS catalog_code CASCADE;
--> statement-breakpoint
ALTER TABLE hospital_document_template DROP COLUMN IF EXISTS is_enabled;
--> statement-breakpoint
ALTER TABLE hospital_document_template DROP COLUMN IF EXISTS forked_from_catalog_version;
--> statement-breakpoint
DROP INDEX IF EXISTS hospital_document_template_hospital_catalog_uidx;
--> statement-breakpoint
DROP INDEX IF EXISTS hospital_document_template_hospital_enabled_idx;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS hospital_document_hospital_document_uidx
	ON hospital_document_template (hospital_id, document_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS hospital_document_hospital_idx
	ON hospital_document_template (hospital_id);
--> statement-breakpoint
ALTER TABLE hospital_document_template RENAME TO hospital_document;
--> statement-breakpoint
DROP TABLE IF EXISTS document_catalog;
--> statement-breakpoint
ALTER TABLE document DROP COLUMN IF EXISTS catalog_code;
--> statement-breakpoint
ALTER TABLE document DROP COLUMN IF EXISTS is_system_catalog;
--> statement-breakpoint
DROP INDEX IF EXISTS document_catalog_code_idx;
--> statement-breakpoint
DELETE FROM user_group_page WHERE page_id IN (100707);
--> statement-breakpoint
DELETE FROM page WHERE id = 100707;
--> statement-breakpoint
UPDATE page SET status_id = 3 WHERE id IN (100704, 100705);
