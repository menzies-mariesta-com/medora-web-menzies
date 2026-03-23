# Drizzle migrations (Neon / Postgres)

## Where the journal lives

`drizzle-kit migrate` records applied migrations in:

- **Schema:** `drizzle` (not `public`)
- **Table:** `__drizzle_migrations`

Use:

```sql
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

If you query `SELECT * FROM "__drizzle_migrations"` without a schema, Postgres searches `public` and you may see **relation does not exist** even though the real table exists under `drizzle`.

## `relation "account" already exists` on `pnpm db:migrate`

Your database already has tables from migration `0000_*.sql` (or from `db:push`), but the Drizzle journal table is empty or was never written. Migrator then tries to run `0000` from scratch and fails on `CREATE TABLE "account"`.

### Option A — Baseline, then migrate (keep DB data)

1. Print the baseline SQL (hashes match `drizzle-orm/migrator.js`):

   ```bash
   pnpm db:baseline:sql
   ```

2. Run the printed SQL in **Neon SQL Editor** (or any client).

3. Run:

   ```bash
   pnpm db:migrate
   ```

   Only migrations **after** the baseline marker should run (by default, everything except the **last** journal entry is marked applied; adjust with `--pending N` if you need more than one migration to still run — see script header).

### Option B — Empty dev database

Create a fresh Neon branch / database, set `DATABASE_URL`, then run `pnpm db:migrate` once on an empty database.

## `db:push` timeouts

`ETIMEDOUT` to Neon’s WebSocket is a **network** issue (VPN, firewall, pooler host). Try another network, a non-pooler URL if Neon recommends it for CLI, or retry later.
