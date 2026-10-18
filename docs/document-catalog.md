# Hospital document template catalog

Phase 1 ships a versioned HTML print catalog in code under `src/lib/server/medora/document-master/catalog/`. System rows sync into `document` and `document_catalog` via `ensureDocumentCatalogSynced()`.

## Admin

- **Template library**: enable/disable catalog entries per hospital (fork on enable).
- **Hospital templates**: enabled forks and custom hospital documents.
- **Document Master**: edit forked HTML and layout like custom documents.

## Runtime

- EMR clinical-document lists enabled hospital templates plus custom hospital documents.
- Transactional print codes resolve through hospital bindings when enabled.

## Maintenance

```bash
pnpm run verify-document-catalog
pnpm run db:seed:information   # runs catalog sync after legacy document seeds
```

See `docs/document-catalog-qa-checklist.md` for manual print QA.
