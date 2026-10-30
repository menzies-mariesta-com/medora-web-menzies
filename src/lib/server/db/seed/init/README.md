# Init seeds

Run in order via `pnpm db:seed:init` (or `pnpm db:seed`).

| File | Command |
|------|---------|
| `master-table-seed.ts` | `pnpm db:seed:init:master` |
| `auth-table-seed.ts` | `pnpm db:seed:init:auth` |
| `information-table-seed.ts` | `pnpm db:seed:init:information` |
| `marketplace-table-seed.ts` | `pnpm db:seed:init:marketplace` |

Helpers (imported by information seed, not run directly):

- `seed-ed-triage-levels.server.ts` — ED triage levels 1–5 per active hospital  
- `diagnosis-code-seed-catalog.ts` — reserved catalog constants (WHO import uses API)
