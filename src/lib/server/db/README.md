# lib > server > db

## Source of truth (development)

| Layer | Location | Apply |
|-------|-----------|--------|
| **Schema** (tables, columns, indexes, checks) | `src/lib/server/db/table/**/*.ts` | `pnpm db:push` |
| **Reference data** | `src/lib/server/db/seed/init/*.ts` | `pnpm db:seed` |

Numbered `drizzle/*.sql` files are optional history (`db:migrate`, `db:reset:migrate`). Day-to-day: **push + seed** only.

Init seeds are **insert-only** (`INSERT` / `ON CONFLICT` upsert). See [`seed/README.md`](seed/README.md).

## Seeds

- **Init:** `pnpm db:seed` → master → auth → information → marketplace  
- **Demo:** `pnpm db:seed:demo:*` → sample hospital data only  

## Connection pooling (performance)

- **`ensureDb()`** returns the same singleton every time; it does **not** create a new connection per call.
- **Neon server-side pooling**: Use the **pooled** `DATABASE_URL` (host with `-pooler`) for concurrency.