---
name: prefix-financial-year-and-counter-flow
description: Documents and enforces the Prefix Configuration + Prefix Format + Prefix Counter + Financial Year flow in this repo. Use when implementing or debugging code generation (patient codes, visit numbers, billing/invoice numbers), adding new prefix purposes/keys, changing counter scope (branch/financial year/visit type), or writing related Drizzle migrations/UI.
---

# Prefix + Financial Year + Counter flow (Heka)

## Source of truth (current design)

- **Template** lives in `prefix_format`
  - One row per `(hospital_id, key)`
  - Stores:
    - `format` JSON (parts: literal/field/sequence)
    - `counter_include_*` scope flags as **digits** (`YesNoEnum`: 1/0)
- **Counter** lives in `prefix_counter`
  - One row per **scope bucket** (hospital + key + optional dims)
  - Stores:
    - `last_no` (running number)
    - `branch_id`, `financial_year_id`, `visit_type_id` (nullable)
    - `scope_key` (unique stable string)

## End-to-end generation flow

When generating codes (e.g. patient code, visit number):

1. **Determine context IDs**
   - **hospitalId**: always required
   - **branchId**: optional
   - **financialYearId**: chosen by “today in range” query (see below)
   - **visitTypeId**: optional; provided by caller via `context.visitTypeId`

2. **Load template + scope flags**
   - Read from `prefix_format` where:
     - `hospital_id = hospitalId`
     - `key = prefixKey`
     - `deleted_at IS NULL`
   - If missing, use in-memory defaults (purpose-based).

3. **Allocate next number atomically**
   - Build `scope_key` using `buildPrefixCounterScopeKey({ ..., scope })`.
   - Upsert `prefix_counter` by `scope_key`:
     - insert `last_no = 1` on first use
     - on conflict: `last_no = last_no + 1`
     - return the new `last_no`
   - Critical: store nullable scope columns as **null when the flag is off**.

4. **Render the prefix**
   - Iterate `format.parts`:
     - `literal` → append
     - `field` → resolve DB-backed codes (`hospital.code`, `branch.code`, `financial_year.code`, `visit_type.code`)
     - `sequence` → use returned `last_no` and `padStart`
   - Accept legacy sequence `source` values in stored JSON:
     - `prefix_counter.last_no` (preferred)
     - `prefix_configuration.last_no` (legacy)

## Financial year selection contract

Financial year is selected by date range for a hospital:

- Must satisfy (inclusive):
  - `start_date <= today`
  - `end_date >= today`
- Requirements:
  - Avoid **overlapping** financial years for a hospital (otherwise selection can be nondeterministic).
  - Consider timezone implications: `today` is computed from server/runtime.

Effect on numbering:
- If `counter_include_financial_year = 1`, a new FY creates a **new counter bucket** (sequence restarts per FY).
- If `= 0`, sequence continues across FY; only `financial_year.code` changes in the rendered string.

## Counter scope flags (database-defined)

Scope is defined in `prefix_format` (per hospital + key):

- `counter_include_branch` (0/1)
- `counter_include_financial_year` (0/1)
- `counter_include_visit_type` (0/1)

These flags determine:
- Which optional IDs are included in `scope_key`
- Which nullable FK columns are populated on the `prefix_counter` row

### Stability rule

If any scope flags change for an existing key/hospital:
- Existing `prefix_counter.scope_key` values may no longer match the “new” computed keys.
- Provide a repair migration or maintenance routine that recomputes `scope_key` for counters from the current flags.

## Admin UI contract (Prefix Configuration page)

UI should:
- Show **purposes** (fixed keys) like Patient / Visit; users edit:
  - description
  - format parts
  - counter scope flags (checkboxes)
- Persist scope flags as digits using `YesNoEnum`:
  - checkbox `true` → `YesNoEnum.YES (1)`
  - checkbox `false` → `YesNoEnum.NO (0)`
- Convert digits back to booleans when loading a row.

## Adding a new purpose/key (example: BILLING_INVOICE_NO)

1. Add key constant (e.g. `PREFIX_PURPOSE_STORAGE.BILLING_INVOICE_NO`)
2. Add purpose entry for UI (label + help)
3. Define defaults:
   - Default format template
   - Default scope flags in DB (or in fallback defaults)
4. Ensure the business flow calls `generatePrefix({ prefixKey: BILLING_INVOICE_NO, ... })`
5. Add/adjust migrations if existing data needs backfill

## Migrations guidelines (Drizzle SQL files)

When changing `prefix_format` / `prefix_counter`:
- Prefer **additive** migrations (add columns/tables, backfill, then drop legacy).
- Keep `scope_key` computation identical between:
  - SQL backfills/repairs
  - `buildPrefixCounterScopeKey` in TypeScript
- If converting boolean → digits:
  - Use `YesNoEnum` semantics: YES=1, NO=0
  - Update any SQL `CASE` checks to compare with `= 1`

