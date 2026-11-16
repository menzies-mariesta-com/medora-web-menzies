DROP TABLE IF EXISTS hospital_document_print_option;
--> statement-breakpoint
DROP INDEX IF EXISTS document_type_purpose_key_uidx;
--> statement-breakpoint
ALTER TABLE document_type DROP COLUMN IF EXISTS purpose_key;
--> statement-breakpoint
ALTER TABLE document_catalog DROP COLUMN IF EXISTS purpose_key;
