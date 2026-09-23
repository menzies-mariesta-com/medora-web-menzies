# Drizzle migrations (Neon / Postgres)

## Happy path (empty / new database)

```bash
pnpm db:migrate
pnpm db:seed
```

Migrations live under `drizzle/`. The journal starts at a single **`0000_baseline`** that matches the current TypeScript schema (older broken incremental files were squashed away — no production DB depended on them).

After schema changes:

```bash
pnpm db:generate   # writes drizzle/0001_….sql (+ snapshot)
pnpm db:migrate    # apply pending SQL
```

Prefer **`db:migrate`** over **`db:push`** for anything you want tracked in git. Use `db:push` only for emergency local experiments.

## Where the journal lives

`drizzle-kit migrate` records applied migrations in:

- **Schema:** `drizzle` (not `public`)
- **Table:** `__drizzle_migrations`

```sql
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

If you query `SELECT * FROM "__drizzle_migrations"` without a schema, Postgres searches `public` and you may see **relation does not exist** even though the real table exists under `drizzle`.

## `relation "account" already exists` on `pnpm db:migrate`

The database already has tables (e.g. from an old `db:push`), but `drizzle.__drizzle_migrations` is empty. Migrator then re-runs `0000_baseline` and fails.

### Option A — Baseline journal only (keep data)

1. Print SQL (hashes match `drizzle-orm/migrator.js`):

   ```bash
   pnpm db:baseline:sql -- --pending 0
   ```

2. Run that SQL in Neon SQL Editor (or any client).

3. `pnpm db:migrate` should report nothing pending.

### Option B — Empty database

Wipe schemas and migrate from scratch:

```sql
DROP SCHEMA IF EXISTS drizzle CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO CURRENT_USER;
```

Then:

```bash
pnpm db:migrate
pnpm db:seed
```

## Partial unique indexes

In schema `.where(...)` clauses for indexes, use **SQL literals** (e.g. `= 1`), not `${SomeEnum.VALUE}`. Bound parameters become `$1` in DDL and fail on Neon (`there is no parameter $1`).

## `db:push` timeouts

`ETIMEDOUT` to Neon’s WebSocket is a **network** issue (VPN, firewall, pooler host). Try another network, a non-pooler URL if Neon recommends it for CLI, or retry later.
