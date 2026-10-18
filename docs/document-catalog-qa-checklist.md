# Document catalog QA checklist

Use for each new domain module or before a major catalog release.

## Automated

- [ ] `pnpm run verify-document-catalog` passes (count, titles, `en` bodies, placeholders).
- [ ] `pnpm run check` passes.

## Print preview (sample per category)

- [ ] Hospital header/footer from `document_setting` visible.
- [ ] Body text 11-12px equivalent, readable on A4.
- [ ] Signature blocks have adequate vertical space (~2cm).
- [ ] Page breaks do not split signature rows awkwardly.
- [ ] Placeholders shown as `{{...}}` in preview (not blank errors).

## Legal / admin

- [ ] Template library shows legal review banner.
- [ ] Enable flow requires acknowledgment checkbox.
- [ ] Disabled templates retain fork but hide from EMR.

## Locale

- [ ] Enable with `en` renders English body.
- [ ] `my` stub falls back to `en` when stub body empty.
