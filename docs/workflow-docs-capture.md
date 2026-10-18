# Workflow documentation capture

Automated browser capture produces screenshot-based, plain-language workflow guides under `/docs/workflows`.

## Golden path (recommended)

**Terminal A:** dev server

```bash
npm run dev
```

**Terminal B:** seed, preflight, capture

```bash
npm run db:seed:docs-demo
npm run docs:capture:preflight
npm run docs:capture -- --resume
```

If table-data errors mention inventory, re-run `npm run db:seed:docs-demo` (or `npm run db:seed:docs-demo-inventory` only) before `--resume` or `--retry-failed`.

### Two-factor authentication

**Interactive (default):** enter a fresh 6-digit TOTP in the terminal when prompted during `npm run docs:capture`.

**Unattended (long full capture):** temporarily disable 2FA in the database and restore when finished:

```bash
DOCS_CAPTURE_USE_DB_2FA_TOGGLE=1 npm run docs:capture:preflight
DOCS_CAPTURE_USE_DB_2FA_TOGGLE=1 npm run docs:capture -- --resume
```

Uses `scripts/.docs-capture-2fa-backup.json`. Requires Neon/`DATABASE_URL` access from this machine.

## Prerequisites

1. **Testing Hospital 1** exists with at least one active branch (`01a0cd12-1af6-7839-a4ce-6d834497a0ba` unless overridden).
2. Seed demo data for that hospital:

```bash
npm run db:seed:docs-demo
```

This runs global seed (modules, document master catalog, EMR demo services), visit-history demo, transactional demo rows, and **inventory docs demo** (GRN, department issue, consumption, report rows). Set `DOCS_DEMO_SKIP_GLOBAL=1` to skip the global `db:seed` pass. Set `DOCS_DEMO_SKIP_INVENTORY=1` to skip inventory transactional seed only.

**WHO ICD-API:** `db:seed:docs-demo` sets `WHO_ICD_SKIP_SEED=1` automatically so seeding does not call `icdaccessmanagement.who.int` (common VPN/firewall timeouts). Workflow doc capture does not need the diagnosis catalogue. To run a full WHO import during global seed, set `WHO_ICD_SKIP_SEED=0` before running.

3. **Dev server in a separate terminal:** `npm run dev` (port 4002). Capture waits up to 2 minutes for it to respond.
4. `.env` includes `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `DATABASE_URL`, and optionally `DOCS_CAPTURE_HOSPITAL_ID` / `SEED_HOSPITAL_ID`.

## Preflight

Before the Playwright loop, `npm run docs:capture` runs preflight by default (env, inventory seed marker, authenticated API probes for inventory report lists). Skip with `DOCS_CAPTURE_SKIP_PREFLIGHT=1` or when using `--slug=...` only.

```bash
npm run docs:capture:preflight
```

## Run full capture (~147 workflows)

```bash
npm run docs:capture
```

Capture signs in as the seed admin, warms up the hospital home layout, sets the **From store** cookie on inventory ops routes (ward store for receipt-from-store), opens each screen (redirect-only parents capture the first sub-tab), waits until the **module bar** (and staff sub-tabs when applicable) is populated, then waits for the work area. For **MenziesTable** lists it waits until the tbody **loading spinner is gone**, the list **GET API** has responded, and the footer shows **Showing 1-N of M** (or at least one data row). It will **not** screenshot mid-load "Showing 0 of 0" with a spinner. For **dialogs** (create, edit, delete confirm, and iframe embeds such as Staff List view/edit), capture waits until the modal is open and the body has finished loading (iframe `domcontentloaded` / network idle, no spinner, form fields or card content visible). Screenshots use a **1920x1080** viewport by default (`DOCS_CAPTURE_VIEWPORT_WIDTH` / `DOCS_CAPTURE_VIEWPORT_HEIGHT` to override). Table pages get list / add / form / edit / delete steps; form-only pages get a single **step-01-overview.png**. Optional per-slug waits: `scripts/docs-capture/workflow-recipes.json` (`waitApiPath`, `minTableRows`).

**Interactive 2FA (default):** enter your current 6-digit authenticator code in the terminal when prompted. Progress is saved after each workflow in `scripts/.docs-capture-checkpoint.json` (`completed`, `failedSlugs`, `pendingSlug` for auth retry).

**Resume after pause or expiry:**

```bash
npm run docs:capture -- --resume
```

**Retry only failed slugs (data/UI errors):**

```bash
npm run docs:capture -- --retry-failed
```

## Options

| Command | Purpose |
|---------|---------|
| `npm run docs:capture -- --slug=administration-document-master-document-type` | Single workflow |
| `npm run docs:capture -- --from-slug=registration-patient-registration` | Start at slug |
| `npm run docs:capture -- --resume` | Continue from `pendingSlug` |
| `npm run docs:capture -- --retry-failed` | Re-run slugs in `failedSlugs` only |
| `npm run docs:capture -- --force` | Re-capture even if checkpointed |
| `DOCS_CAPTURE_HEADED=1 npm run docs:capture` | Show browser window |
| `DOCS_CAPTURE_SKIP_PREFLIGHT=1 npm run docs:capture` | Skip preflight gate |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4002 npm run docs:capture` | Custom base URL |

Per-slug waits and visit flags: `scripts/docs-capture/workflow-recipes.json`.

## Output

- Markdown: `src/lib/docs/content/workflows/{slug}.md` with `captureStatus: complete` or `failed` (and optional `captureError` on failure)
- Screenshots on disk: `src/lib/docs/asset/capture/workflows/{slug}/step-*.png` (`step-01-overview.png` for forms, `step-01-list.png` + CRUD steps for tables; default **1920x1080**)
- Markdown uses logical URLs `/docs/capture/workflows/{slug}/step-*.png`; the docs loader resolves them to Vite asset URLs at SSR/prerender. After adding new PNGs locally, restart dev or rebuild so Vite picks up new files.

## Optional: disable 2FA in the database (no terminal codes)

Only if you want fully unattended capture and can reach Neon from this machine:

```bash
DOCS_CAPTURE_USE_DB_2FA_TOGGLE=1 npm run docs:capture
```

Uses `scripts/.docs-capture-2fa-backup.json` and restores 2FA when the run finishes.

## Manual 2FA toggle (database)

```bash
DOCS_CAPTURE_ALLOW_2FA_TOGGLE=1 node scripts/docs-capture-2fa.mjs disable
DOCS_CAPTURE_ALLOW_2FA_TOGGLE=1 node scripts/docs-capture-2fa.mjs restore
```

## Regenerate manifest only

Does not overwrite captured markdown (only stubs with `generated: true`):

```bash
npm run docs:manifest
npm run check:docs-manifest -- --regen-manifest
```

Manifest workflows include `capturePageUrl` for section landing pages that redirect to a first sub-tab.

## After full capture

Enable strict doc verification in CI or locally:

```bash
DOCS_VERIFY_STRICT=1 npm run check:docs-manifest
node scripts/verify-workflow-docs.mjs
```
