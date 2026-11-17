-- Documents and layout settings are information-level (per hospital).
-- Global rows are removed; re-run db:seed:init:information or createHospital provision after migrate.

UPDATE document_catalog
SET
	system_document_id = NULL,
	default_document_setting_id = NULL,
	locale_document_ids_json = '{}'::jsonb,
	updated_at = now()
WHERE system_document_id IS NOT NULL
	OR default_document_setting_id IS NOT NULL
	OR locale_document_ids_json <> '{}'::jsonb;

DELETE FROM hospital_document_print_option
WHERE document_id IN (SELECT id FROM document WHERE hospital_id IS NULL);

DELETE FROM hospital_document_template
WHERE document_id IN (SELECT id FROM document WHERE hospital_id IS NULL);

DELETE FROM patient_document
WHERE document_id IN (SELECT id FROM document WHERE hospital_id IS NULL);

UPDATE document
SET document_setting_id = NULL
WHERE document_setting_id IN (
	SELECT id FROM document_setting WHERE hospital_id IS NULL
);

UPDATE hospital_document_template
SET document_setting_id = NULL
WHERE document_setting_id IN (
	SELECT id FROM document_setting WHERE hospital_id IS NULL
);

DELETE FROM document WHERE hospital_id IS NULL;

DELETE FROM document_setting WHERE hospital_id IS NULL;

ALTER TABLE document ALTER COLUMN hospital_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE document_setting ALTER COLUMN hospital_id SET NOT NULL;
