# RxNorm local CDS import order

1. Apply migrations: `pnpm db:migrate`
2. Import RxNorm Full: `pnpm db:import:rxnorm`
   - Options: `--dry-run`, `--limit 5000`, `--use-cache`, `--all-tty`, `--include-ndc`, `--release-id YYYY-MM`
3. (After legal review) DDInter: `ALLOW_DDINTER_IMPORT=true pnpm db:import:ddinter`
4. openFDA interactions: `pnpm db:import:openfda-interactions -- --limit 100`

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres (required) |
| `RXNORM_FULL_ZIP_URL` | Override RxNorm zip URL |
| `RXNORM_RELEASE_ID` | Release label stored in `rxnorm_release` |
| `ALLOW_DDINTER_IMPORT` | Must be `true` for DDInter import |
| `DDINTER_CSV_URL` | Override DDInter CSV URL |
## Admin UI

- Map items: Administration → RxNorm drug mapping
- Catalog status: Administration → RxNorm catalog

See also: [rxnorm-cds-licenses.md](./rxnorm-cds-licenses.md)
