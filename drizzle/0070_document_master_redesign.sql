-- Document Master redesign (schema only — data from information-table seed)

ALTER TABLE document_type ADD COLUMN IF NOT EXISTS purpose_key varchar(64);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS document_type_purpose_key_uidx ON document_type (purpose_key);

ALTER TABLE document ADD COLUMN IF NOT EXISTS clinical_section varchar(32);
--> statement-breakpoint

ALTER TABLE document_catalog ADD COLUMN IF NOT EXISTS purpose_key varchar(64);
ALTER TABLE document_catalog ADD COLUMN IF NOT EXISTS clinical_section varchar(32);
--> statement-breakpoint

ALTER TABLE document_setting ADD COLUMN IF NOT EXISTS document_id integer REFERENCES document(id) ON DELETE CASCADE;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS document_setting_document_id_uidx ON document_setting (document_id) WHERE document_id IS NOT NULL;

ALTER TABLE document_setting DROP COLUMN IF EXISTS document_type_id;
--> statement-breakpoint
DROP INDEX IF EXISTS document_setting_document_type_id_idx;

CREATE TABLE IF NOT EXISTS hospital_document_print_option (
	id serial PRIMARY KEY NOT NULL,
	hospital_id uuid NOT NULL REFERENCES hospital(id) ON DELETE CASCADE,
	purpose_key varchar(64) NOT NULL,
	document_id integer NOT NULL REFERENCES document(id) ON DELETE CASCADE,
	is_enabled boolean DEFAULT true NOT NULL,
	is_default boolean DEFAULT false NOT NULL,
	sort_order integer DEFAULT 0 NOT NULL,
	status_id integer DEFAULT 1 NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS hospital_doc_print_opt_hosp_purpose_doc_uidx
	ON hospital_document_print_option (hospital_id, purpose_key, document_id);
CREATE INDEX IF NOT EXISTS hospital_doc_print_opt_hospital_purpose_idx
	ON hospital_document_print_option (hospital_id, purpose_key, is_enabled);

CREATE TABLE IF NOT EXISTS hospital_document_text_placeholder (
	id serial PRIMARY KEY NOT NULL,
	hospital_id uuid NOT NULL REFERENCES hospital(id) ON DELETE CASCADE,
	code varchar(64) NOT NULL,
	text text NOT NULL,
	description text,
	status_id integer DEFAULT 1 NOT NULL,
	created_at timestamp with time zone DEFAULT now() NOT NULL,
	updated_at timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS hospital_doc_text_ph_hospital_code_uidx
	ON hospital_document_text_placeholder (hospital_id, code);
CREATE INDEX IF NOT EXISTS hospital_doc_text_ph_hospital_idx
	ON hospital_document_text_placeholder (hospital_id);
