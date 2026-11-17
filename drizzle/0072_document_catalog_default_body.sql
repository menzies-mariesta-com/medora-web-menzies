-- Global reusable template HTML lives on document_catalog (master); hospitals fork on enable.

ALTER TABLE document_catalog ADD COLUMN IF NOT EXISTS default_body_html text;
ALTER TABLE document_catalog ADD COLUMN IF NOT EXISTS default_document_number varchar(512);
ALTER TABLE document_catalog ADD COLUMN IF NOT EXISTS body_locked boolean NOT NULL DEFAULT false;
