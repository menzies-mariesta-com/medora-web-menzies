# Database seeds

| Folder | Purpose | Run all |
|--------|---------|---------|
| [`init/`](./init/) | Static reference data (lookups, nav, status tagging, documents, ED triage levels) | `pnpm db:seed` or `pnpm db:seed:init` |
| [`demo/`](./demo/) | Sample hospital data (patients, staff, visits, inventory) | Individual `pnpm db:seed:demo:*` only |

## Init (`pnpm db:seed:init:*`)

1. `db:seed:init:master` — global lookups  
2. `db:seed:init:auth` — roles; optional admin via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`  
3. `db:seed:init:information` — modules, pages, status tagging, document catalog provision, allergy, ED triage / trauma defaults per hospital  
4. `db:seed:init:marketplace` — marketplace metadata  

**Insert-only:** init seeds use `INSERT` with `ON CONFLICT` upsert only. No `UPDATE`, `DELETE`, `ALTER`, `TRUNCATE`, or backfill.

**Fresh DB (dev):** `pnpm db:push` → `pnpm db:seed` → create hospital in app → optional `pnpm db:seed:demo:*`.

## Demo (`pnpm db:seed:demo:*`)

| Command | Script |
|---------|--------|
| `db:seed:demo:emr` | Demo doctors + service items |
| `db:seed:demo:er` | Demo ER ward `ER-DEMO` + beds |
| `db:seed:demo:transaction` | Appointments + visits |
| `db:seed:demo:visit-history` | Rich visit history |
| `db:seed:demo:docs` | Docs capture bundle |
| `db:seed:demo:docs-inventory` | Inventory rows for docs capture |

See also [`../README.md`](../README.md).