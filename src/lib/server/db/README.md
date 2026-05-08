# lib > server > db

> Created: June 21, 2025 | Updated: April 26, 2026

## Seeds (`src/lib/server/db/seed/`)

Run order (see root `package.json`): **`db:seed:master`** → **`db:seed:auth`** → **`db:seed:information`** → **`db:seed:marketplace`**, or **`pnpm db:seed`** for all.

- **`information-table-seed.ts`**: modules, pages, **`status_tagging_type` / `status_tagging`** (inventory document statuses, including **Department indent** type **8**, ids **40–45**), and **section 7b** — idempotent DDL on **`inv_approval_level`** / **`inv_approval_log`**: module **`CHECK`** (`PR`,`PO`,`DI`,`SI`,`SR`) and **partial unique** index on active rows. Use this when you rely on **`pnpm db:seed`** without a full **`pnpm db:migrate`** so approval config matches migrations **0039–0041** (inventory tables such as `inv_approval_level` must already exist).

## Connection pooling (performance)

- **`ensureDb()`** returns the same singleton every time; it does **not** create a new connection per call.
- **Neon server-side pooling**: Use Neon’s **pooled** connection string so PgBouncer pools connections. In Neon Console → Connect → enable “Connection pooling” and use the URL whose host includes `-pooler` (e.g. `ep-xxx-pooler.region.aws.neon.tech`). Set that as `DATABASE_URL` for best behavior under concurrency.
- **In-process pooling** (optional): For a long-lived Node server (e.g. adapter-node), you can use the WebSocket driver with a `Pool`: install `ws`, use `drizzle-orm/neon-serverless` with `Pool` from `@neondatabase/serverless` and pass it to `drizzle(pool)`. See [Neon Drizzle guide](https://neon.tech/docs/guides/drizzle) (“Neon WebSocket” tab).
