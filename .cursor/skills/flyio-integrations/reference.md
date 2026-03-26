## Fly.toml essentials

At minimum, a working `fly.toml` usually defines:

- `app`: Fly app name
- `primary_region`: where Fly runs the app initially
- `http_service` (or `services`): internal port mapping + handlers
- `checks`: health check type + endpoint/port + thresholds

Common health check patterns:

- **HTTP**: used when you can serve `/health` (recommended)
- **TCP**: used when HTTP routing isn’t stable yet (fallback)

### Secrets vs env vars

- **Do not** commit secrets to the repo.
- Prefer **Fly secrets** (`fly secrets set ...`) and reference them in `fly.toml` or your runtime config.
- In CI, pass only `FLY_API_TOKEN` (or a deploy token) as a secret env var.

## Common flyctl commands (app)

**Lifecycle**

- `fly launch` (interactive first-time setup)
- `fly deploy` (subsequent deploys)
- `fly status` (health/allocations)

**Logs / debugging**

- `fly logs`
- `fly ssh console -a <app>` (or equivalent console access)

## Common flyctl commands (Postgres / Redis)

**Postgres**

- `fly postgres create -n <postgres-app-name> -r <region>`
- `fly postgres connect -a <postgres-app-name>` (opens a `psql` session)

**Redis**

- `fly redis create -n <redis-app-name> -r <region>`
- `fly redis connect -a <redis-app-name>` (opens a `redis-cli` session)

## Provisioning checklist (data services)

1. Create the Fly-managed data service (`fly postgres create` / `fly redis create`)
2. Add connection strings to Fly secrets (example secret names your app expects):
   - `DATABASE_URL`
   - `REDIS_URL`
3. Run migrations/schema setup (often locally first; or via a Fly one-off job pattern)
4. Enable/verify backups and HA if needed
5. Confirm from the app logs that connections succeed

## CI/CD cheat sheet (GitHub Actions)

Typical ingredients:

- Install flyctl in the workflow
- Authenticate using `FLY_API_TOKEN` from repository secrets
- Deploy using `fly deploy --remote-only` (optional but useful)

Deploy token command:

- `fly tokens create deploy -x <duration>`
