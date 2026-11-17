# Document templates (code catalog)

Shipped HTML print templates live in **code** under `src/lib/server/medora/document-master/catalog/`.  
`getAllCatalogTemplates()` is the source of truth for **seed/provision** only.

Hospital runtime data:

- `document` — global HTML templates; **primary key `id`**; optional `code` only for legacy print aliases (`BILL_PRINT`, …)
- `hospital_document` — link row `(hospital_id, document_id)` after provision
- No `document_catalog` database table

Provision: `provision-templates.server.ts` / `document-master-provision.seed.ts` on hospital create and information seed.

Print surfaces resolve templates by **`document_type.id`** via `GET .../document-print?documentTypeId=`.
