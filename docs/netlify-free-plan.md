# Medora on Netlify Free — realistic playbook

Medora is a **full Node EMR** (Better Auth, argon2, Drizzle, Neon pool, large Paraglide). Netlify **Free** can host it for **demos and light use**, but you are fighting **cold starts**, a **~10s function timeout**, and **US/EU compute vs Neon in ap-southeast**. This doc is the best-effort checklist without paying for Pro or moving to Fly/VPS.

## Hard limits (Free)

| Limit | Effect on Medora |
|--------|------------------|
| **~10s function timeout** | Heavy SSR + several DB round trips can fail; **never** run ICD reseed / long imports via the site |
| **Cold starts** | First click after idle is slow; one bundled function loads the whole app |
| **125k function invocations / month** | Many users + auto-refresh can burn quota |
| **Build minutes** | Paraglide + Vite need RAM; use GitHub Actions deploy (`netlify-build.yml`) if Netlify OOMs |

You **cannot** fully “fix” cold starts on Free; you can **reduce** work per request and keep the function warm occasionally.

## Netlify UI (required)

Set in **Site configuration → Environment variables** (then redeploy):

- `DATABASE_URL` — Neon **pooler** host (`…-pooler.…`)
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_BASE_URL`, `BETTER_AUTH_URL` = your site origin
- `BETTER_AUTH_TRUSTED_ORIGINS` = same origin(s)
- Tigris + SMTP vars as in `.env.example`

Missing vars → “function has crashed” on login.

## Code optimizations (in repo)

1. **`netlify.toml`** — `external_node_modules` for `argon2` and `ws` (when present).
2. **Prerendered marketing/docs** (`/`, `/pricing`, `/docs/*`) — served as **static files**, no function (good).

## Ops tricks (Free)

1. **Deploy via GitHub Actions** when builds OOM on Netlify (`/.github/workflows/netlify-build.yml`).
2. **Optional warm ping** — External uptime monitor hitting `https://yoursite.netlify.app/` every 5–10 minutes reduces cold starts but **uses invocation quota**.
3. **Keep Neon close** — Use **ap-southeast** Neon; latency from Netlify US functions is unavoidable on Free (no region pick).
4. **CLI for heavy jobs** — `pnpm db:import:icd`, seeds: run locally with `--env-file=.env`, not admin UI in production.

## When Free is not enough

- Frequent **“function has crashed”** after env is correct → check **Functions → Logs** (OOM vs timeout).
- Hospital **production** staff daily use → **Fly/Railway/VPS (2 vCPU / 4 GB)** + same Neon/Tigris is the intended path (`adapter-node`).

## What not to expect on Free

- Netlify Free will not feel like `pnpm run dev`.
- Pro raises timeout/memory but **does not** remove cold starts or DB distance.
