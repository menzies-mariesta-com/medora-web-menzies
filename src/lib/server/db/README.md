# lib > server > db

> Created: June 21, 2025 | Updated: June 21, 2025

## Notes

1. Put all

## Connection pooling (performance)

- **`ensureDb()`** returns the same singleton every time; it does **not** create a new connection per call.
- **Neon server-side pooling**: Use Neon’s **pooled** connection string so PgBouncer pools connections. In Neon Console → Connect → enable “Connection pooling” and use the URL whose host includes `-pooler` (e.g. `ep-xxx-pooler.region.aws.neon.tech`). Set that as `DATABASE_URL` for best behavior under concurrency.
- **In-process pooling** (optional): For a long-lived Node server (e.g. adapter-node), you can use the WebSocket driver with a `Pool`: install `ws`, use `drizzle-orm/neon-serverless` with `Pool` from `@neondatabase/serverless` and pass it to `drizzle(pool)`. See [Neon Drizzle guide](https://neon.tech/docs/guides/drizzle) (“Neon WebSocket” tab).
