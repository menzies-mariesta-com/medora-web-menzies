# Demo seeds

**Not** part of `pnpm db:seed`. Requires at least one hospital and branch (create via the app after init seed).

| File | Command |
|------|---------|
| `emr-order-demo-seed.ts` | `pnpm db:seed:demo:emr` |
| `seed-demo-er-master.server.ts` | `pnpm db:seed:demo:er` |
| `transaction-table-seed.ts` | `pnpm db:seed:demo:transaction` |
| `visit-history-demo-seed.ts` | `pnpm db:seed:demo:visit-history` |
| `docs-demo-hospital-seed.ts` | `pnpm db:seed:demo:docs` |
| `inventory-docs-demo-seed.ts` | `pnpm db:seed:demo:docs-inventory` |

Supporting: `emr-order-demo-catalog.ts`, `visit-history-demo-catalog.ts`, `dev-emr-order-service-filter-test-data.sql`.
