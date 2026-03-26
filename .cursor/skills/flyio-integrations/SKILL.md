---
name: flyio-integrations
description: Guides Fly.io deployments and integrations using `flyctl`, `fly.toml`, Fly Postgres/MySQL, Redis, secrets, and CI/CD. Use when the user mentions Fly.io, `flyctl`, `fly.toml`, Fly Postgres/Redis, secrets, or deploying with GitHub Actions/CircleCI.
---

# Fly.io Integrations

## Instructions

When the user asks about Fly.io or related tooling, help them by producing a step-by-step deployment/integration plan and (when possible) concrete `flyctl` commands plus the `fly.toml`/CI snippets to copy.

### 1) Gather the minimum inputs

Ask (or infer) the following before giving commands:

- **App type**: framework/runtime (Node, Python, Go, SvelteKit, etc.)
- **Service port**: which internal port the app listens on (e.g. `3000`)
- **App identity**: desired Fly app name and (if relevant) target org
- **Data needs**: Postgres/MySQL and/or Redis required?
- **Where to store secrets**: Fly secrets (preferred) vs env vars in CI vs local `.env`
- **CI/CD target**: GitHub Actions / CircleCI / other, and whether you want remote-only builds

### 2) Deployment workflow (app on Fly)

Follow this checklist:

- [ ] Ensure the project builds locally (or produces a deployable Dockerfile)
- [ ] Create/confirm `fly.toml` (app name, primary region, services/ports)
- [ ] Set health checks in `fly.toml` (HTTP/TCP) so Fly can manage rollouts
- [ ] Add required environment variables to secrets (e.g. `DATABASE_URL`, API keys)
- [ ] Provision/attach volumes if you need persistence
- [ ] Run:
  - `fly launch` (first deploy) or `fly deploy` (subsequent deploys)
- [ ] Verify:
  - `fly status`
  - `fly logs` (and/or filter by allocation)
  - `fly ssh console` (or equivalent) for runtime inspection

### 3) Provisioning Fly-managed data services (optional)

If the user needs databases/Redis, propose a safe, repeatable sequence:

**Postgres/MySQL**

- [ ] Create the database cluster/app using the matching `flyctl` command (e.g. `fly postgres create`)
- [ ] Decide which app(s) should access it:
  - app-level connection from your service (external networking via Fly)
  - or “internal only” patterns where appropriate
- [ ] Configure backups/HA when needed
- [ ] Apply schema/migrations using your usual migration tool (often locally first)
- [ ] Store connection details in Fly secrets (e.g. `DATABASE_URL`)

**Redis (Upstash on Fly)**

- [ ] Create Redis using `fly redis create`
- [ ] Attach connection info to Fly secrets used by your app (e.g. `REDIS_URL`)

### 4) Secrets management (required for real deployments)

Help them avoid leaking secrets in git and logs:

- [ ] Create deploy tokens in a CI-safe way (short-lived where possible)
- [ ] Use `fly secrets set` for runtime secrets
- [ ] Use `fly secrets list` and `fly secrets unset` for hygiene
- [ ] Prefer secret names that your app code already expects

### 5) CI/CD integration (example-first)

If the user requests CI/CD, generate a workflow that:

- installs `flyctl`
- authenticates via `FLY_API_TOKEN` (set as a repository secret)
- deploys using `fly deploy --remote-only` when Docker build availability is uncertain

### 6) Debugging checklist

When deploys fail or the app is unhealthy, walk through:

- `fly status` for health/allocations
- `fly logs` for startup errors and crash loops
- ensure `fly.toml` checks match the app’s actual route/port
- verify the app listens on the expected internal port
- confirm secrets are present (`fly secrets list`) and not empty/incorrect
- verify volumes/mounts if persistence is required

## Cheat-sheets (copy/paste)

Use these as starting points; adjust flags/options to the user’s situation.

**Deploy / inspect**

- `fly launch`
- `fly deploy`
- `fly status`
- `fly logs`
- `fly ssh console -a <app>`

**Health checks**

- Prefer an HTTP check when the app has a stable health endpoint.
- Set the check to the port in `fly.toml`.

**Postgres (Fly-managed)**

- `fly postgres create -n <postgres-app-name> -r <region>`
- `fly postgres connect -a <postgres-app-name>`

**Redis (Upstash on Fly)**

- `fly redis create -n <redis-app-name> -r <region>`
- `fly redis connect` (use `-r/-o` flags if you need to target region/org)

**Secrets**

- `fly secrets set KEY=VALUE`
- `fly secrets list`
- `fly secrets unset KEY`

**Deploy token (CI)**

- `fly tokens create deploy -x <duration>`

**CI/CD deploy command**

- `fly deploy --remote-only`

## Deliverables

When applying this skill, output:

- a **short plan** (what you’ll do next)
- the **exact `flyctl` commands** to run (with placeholders)
- the **minimal `fly.toml`/CI snippet** changes to make
- a **verification step** using `fly status` / `fly logs`
