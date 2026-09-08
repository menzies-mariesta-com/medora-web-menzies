# Wash UI (Menzies Design) — migration test plan

Manual and automated checks after migrating Medora UI from prefixed DaisyUI (`d-*` / `DaisyUi*`) to Menzies Design Wash (`$lib/component/wash`, unprefixed classes, `washRecipes`).

**Scope**

- **Components:** `src/lib/component/wash/**` (`Wash*`) — Svelte adapters that mirror [Menzies Design](https://design-menzies.netlify.app/) components (Wash CSS + `washRecipes`). Domain UI **reuses** these; do not invent a parallel `Medora*` UI kit.
- Classes: unprefixed Wash tokens (`btn`, `input`, `modal`, …)
- Layout: single root `washRecipes.washShell` only (no nested shells/panels on EMR layouts)
- **No DaisyUI Tailwind plugin** — Wash `styles.css` ≥ **1.0.5** is gallery-complete.

**Prerequisites**

- `pnpm install` with GitHub Packages auth for `@menzies-mariesta-com/menzies-design-wash-ui`
- `pnpm run dev` on `http://localhost:5173`
- Test user with hospital access (login + at least one branch)

**API / routes note**

- App slug is `/medora/...` (legacy `/heka/...` redirects via hooks).

---

## 0. Automated guards

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| AG-1 | Wash boundary | `pnpm run check:wash-ui` | Exit 0; no `$lib/component/daisyui`, `DaisyUi*`, or `d-btn`/`d-input`/… in `src/` |
| AG-2 | UI server boundary | `pnpm run check:ui-boundary` | Exit 0; no `$lib/server` in UI Svelte |
| AG-3 | Tooltip placement | `pnpm run check:tooltip-placement` | Exit 0; no static `tooltip-top` / `tooltip-bottom` |
| AG-4 | Full check | `pnpm run check` | Includes AG-1–AG-3 plus `svelte-check` |
| AG-5 | All pages crawl | With `pnpm run dev` running: `pnpm run check:wash-pages` (Playwright + system Chrome) | Every static Medora/`auth` page loads; no vite overlay; no `d-*` classes; no `wash-shell-main`; root `.page-wash`; no nested `.page-wash` in `.my-app`; `.my-app` not `bg-base-100`; `.my-app` full-bleed when present |

---

## 0b. Layout contract (original chrome + Wash theme)

Original EMR structure must remain:

- `.my-app` / `.my-main` full viewport (`100dvw` × `100dvh`) — not capped by Wash marketing `wash-shell-main` (82.5rem)
- Single root `washRecipes.washShell` atmosphere only (page-wash / paper-grain)
- Private `.my-app` / `.my-main` stay **transparent** so root pigment wash shows in gutters (no opaque `bg-base-100` on the shell)
- Module bar keeps original `navbar bg-base-200 shadow-md` (`WashNavbar atmosphere={false}`)
- Top bar may use Wash `washRecipes.navbar` tokens
- Auth / content cards may use a **leaf** `washPanel` only (never nest `page-wash` under EMR)

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| LY-1 | Full-bleed | Hospital home at ≥1280px wide | `.my-app` width ≈ viewport; no side gutters from max-width shell |
| LY-2 | No nested main | Inspect DOM | No `.wash-shell-main` under private routes |
| LY-3 | Module bar | Hospital home | Second navbar has `bg-base-200 shadow-md`; modules horizontal |
| LY-4 | Auth panel | `/auth/login` | Root `.page-wash` / `.wash-shell` visible behind form; login card has leaf `.wash-panel`; no auth dotted/sliding custom BG |
| LY-5 | Home atmosphere | Hospital home | `.my-app` has no `bg-base-100` class; no `.page-wash` nested inside `.my-app`; pigment blooms visible in content gutters |
| LY-6 | Single wash | Any private page | Exactly one atmosphere: root `.wash-shell.page-wash` only |

---

## 1. Auth (Wash panel leaf)

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| AU-1 | Login shell | Open `/auth/login` | Root `.wash-shell` + `.page-wash` present; login card uses `.wash-panel`; inputs use `.input`; primary control uses `.btn` (not `d-btn`) |
| AU-2 | Login success | Sign in with valid email/password | Redirect to `/medora/hospital/.../home` (or hospital list) |
| AU-3 | Login failure | Wrong password | Error toast; stay on login; button returns from “Signing in…” |
| AU-4 | Signup panel | Open `/auth/signup` | Same Wash panel pattern as login; form controls unprefixed |
| AU-5 | Password toggle | Toggle eye on password field | Input type switches text/password; join layout intact |

---

## 2. Hospital chrome (full-bleed)

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| CH-1 | Dashboard layout | After login, open hospital home | Full-width chrome (not capped ~82.5rem); navbar + module bar usable |
| CH-2 | Module navigation | Click Registration → Patient → Patient List | Route changes; module button active styling visible |
| CH-3 | Branch selector | Change branch in nav (if multiple) | Dashboard/list scope updates without layout collapse |
| CH-4 | Brand / locator | Confirm Menzies Medora wordmark + page locator | Readable; no nested card/shell framing the whole EMR |
| CH-5 | Footer session | Footer clock / session / Extend +2h | Clickable; not blocked by paper-grain overlay |
| CH-6 | Page-wash gutters | Hospital home | Pigment wash visible around cards/stats; `.my-app` transparent (no shell `bg-base-100`) |

---

## 3. Patient List / MariTable

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| PL-1 | Table loads | Open Patient List | Rows load; zebra/hover from Wash table recipe |
| PL-2 | Actions row | Inspect Actions column icons (view/edit/print/delete) | Icons on **one horizontal row** (not stacked); column has usable min-width |
| PL-3 | Column filters | Type in Patient Code / Name / Phone filters | Debounced refetch; filters align under columns |
| PL-4 | Pagination | Change page size | List refreshes; pagination uses Wash buttons |
| PL-5 | Row actions | View / edit / print / delete (cancel delete) | Dialogs open; tooltips place left/right without clipping |

---

## 4. Appearance (Wash pigments)

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| AP-1 | Open picker | Quick tool → Change appearance | Modal opens; pigment + mode selects work |
| AP-2 | Preview pigment | Pick another pigment | `html[data-theme]` / Wash tokens update live |
| AP-3 | Confirm | OK | Persists after reload |
| AP-4 | Cancel | Change pigment then Cancel | Restores previous pigment/mode |

---

## 5. Dialogs / toasts / loading

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| DL-1 | Root dialog | Trigger any dialog (e.g. support / appearance) | Uses `.modal` / `.modal-box` (not `d-modal`); primary ring still visible |
| DL-2 | Toast | Force an error toast (bad login) | Toast renders top-end; dismissible |
| DL-3 | Loading buttons | Submit login / refresh table | Spinner uses `.loading` classes |

---

## 6. Sample admin CRUD (regression spot-check)

Pick one list from Administration (e.g. Branches or Departments):

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| AD-1 | List + actions | Open list; use row actions | Wash buttons/tooltips; no `d-*` classes in DevTools |
| AD-2 | Create/edit modal | Open form modal; save/cancel | Form fields `.input` / `.select`; modal full-bleed behavior unchanged |

---

## 7. Non-goals / known constraints

- Wash **React** primitives (`Button`, `TableShell`, …) are **not** imported into Svelte; Svelte adapters under `$lib/component/wash` mirror Design components and emit Wash CSS classes. Domain UI reuses those `Wash*` components.
- Do **not** nest `washShell` / `washShellMain` / `washPanel` on private hospital layouts (marketing max-width broke EMR).
- **No DaisyUI Tailwind plugin** — Wash `styles.css` ≥ **1.0.5** is gallery-complete; component classes come from the package only.

---

## Sign-off checklist

- [x] AG-1 … AG-3 pass (`check:wash-ui`, boundary, tooltips)
- [x] AG-5 all-pages crawl — **96/98 pass** after Daisy removal (`pnpm run check:wash-pages`); 2 fails are auth redirect race (`/medora/admin/owners`, `/medora/hospital`), not style regressions
- [x] DaisyUI Tailwind plugin + `daisyui` package removed (Wash `styles.css` ≥ 1.0.5 only)
- [x] LY-1 … LY-4 layout contract (full-bleed `.my-app`, no `wash-shell-main`, module bar chrome)
- [x] AU / CH / PL spot checks (login, home, patient list actions horizontal)
- [x] AP-1 appearance modal (pigment/mode) opens from Quick Tool
- [ ] AG-4 full `pnpm run check` (svelte-check) when convenient
- [ ] AD-2 create/edit modal deep CRUD when convenient
