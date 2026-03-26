## `fly.toml` starter (health check + internal port)

Use this as a baseline and adjust to match your app (especially `internal_port` and `path`).

```toml
app = "YOUR_APP_NAME"
primary_region = "iad"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

  [http_service.checks]
    interval = "15s"
    timeout = "2s"
    grace_period = "10s"
    method = "GET"
    path = "/healthz"
```

## Secrets setup (runtime configuration)

Example secret names your app might expect:

```bash
fly secrets set DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DB"
fly secrets set REDIS_URL="redis://HOST:PORT"
```

## Provision Postgres + connect (from your machine)

```bash
fly postgres create -n YOUR_POSTGRES_APP -r iad
fly postgres connect -a YOUR_POSTGRES_APP
```

## Provision Redis + connect (from your machine)

```bash
fly redis create -n YOUR_REDIS_APP -r iad
fly redis connect
```

## GitHub Actions: deploy with `flyctl`

Create `.github/workflows/fly-deploy.yml`:

```yaml
name: Fly Deploy

on:
  push:
    branches: ['main']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up flyctl
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy
        run: fly deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Verification checklist

After the deploy:

- `fly status`
- `fly logs`
- confirm `/healthz` returns a 2xx response from the running app
