# Remove Store Transfer + Stock Issue UI and SI/SR approval modules

## Scope (per user request)

1. **Remove** inventory routes **`…/inventory/store-transfer`** and **`…/inventory/stock-issue`** (pages only is insufficient — remove their **mirrored API** endpoints too so nothing calls dead UI contracts).
2. **Remove** **`SI`** (Stock issue) and **`SR`** (Inter-store receipt) from **Approval configuration**: types, UI select, Drizzle `CHECK` constraints, seed **7b**, and [`manual_inv_approval_module_check.sql`](drizzle/manual_inv_approval_module_check.sql).
3. **Do not remove** underlying DB document types **6 / 7** (`status_tagging` **25–30**) or tables **`inv_store_transfer`** / **`inv_stock_issue`** unless explicitly requested later — **GRN** still calls [`postStoreTransfer`](src/lib/server/heka/inventory/grn.server.ts) from [`transfer.server.ts`](src/lib/server/heka/inventory/transfer.server.ts).

## Server / API split (important)

| Piece | Action |
|--------|--------|
| [`store-transfer/+page.svelte`](src/routes/(private)/heka/hospital/[hospital_id]/home/inventory/store-transfer/+page.svelte) | Delete |
| [`inventory/transfer/+server.ts`](src/routes/api/(private)/heka/hospital/[hospital_id]/home/inventory/transfer/+server.ts) | Delete |
| [`transfer.server.ts`](src/lib/server/heka/inventory/transfer.server.ts) | **Keep** (used by GRN) |
| [`stock-issue/+page.svelte`](src/routes/(private)/heka/hospital/[hospital_id]/home/inventory/stock-issue/+page.svelte) | Delete |
| [`inventory/issue/+server.ts`](src/routes/api/(private)/heka/hospital/[hospital_id]/home/inventory/issue/+server.ts) | Delete |
| [`issue.server.ts`](src/lib/server/heka/inventory/issue.server.ts) | Delete **only consumer was** `issue/+server.ts`; verify no other imports |

## Approval modules SI / SR

- [`inv-approval.type.ts`](src/lib/model/type/heka/inv-approval.type.ts): drop **`SI`**, **`SR`** from `INV_APPROVAL_MODULE_CODES`.
- [`approval-config/+page.svelte`](src/routes/(private)/heka/hospital/[hospital_id]/home/inventory-setup/approval-config/+page.svelte): remove options + label switch branches.
- [`inventory-transaction-table.ts`](src/lib/server/db/table/information-table/inventory-transaction-table.ts): update embedded `CHECK` `module IN (...)` to exclude **`SI`**, **`SR`** (match migration).
- **New migration** (e.g. `0051_drop_si_sr_approval_modules.sql`):  
  - `DELETE FROM inv_approval_assignee WHERE level_id IN (SELECT id FROM inv_approval_level WHERE module IN ('SI','SR'));`  
  - `DELETE FROM inv_approval_level WHERE module IN ('SI','SR');`  
  - Recreate `inv_approval_level_module_chk` / `inv_approval_log_module_chk` **without** `SI`, `SR`.  
  - Same for any **`inv_approval_log`** rows with `module` SI/SR if FK prevents level delete path — include deletes as needed.
- [`information-table-seed.ts`](src/lib/server/db/seed/information-table-seed.ts) section **7b**: align `CHECK` lists with migration (no SI/SR).
- [`manual_inv_approval_module_check.sql`](drizzle/manual_inv_approval_module_check.sql): same module list.
- [`drizzle/meta/_journal.json`](drizzle/meta/_journal.json): register new migration.

## Navigation seed (`page` rows)

- Remove **`(31, 'Store Transfer', …)`** and **`(32, 'Stock Issue', …)`** from the inventory pages `INSERT` in [`information-table-seed.ts`](src/lib/server/db/seed/information-table-seed.ts).
- **Renumber** `sort_order` / sequence for remaining inventory pages **33–36** so submenu order stays contiguous (e.g. Stock becomes 5, Department indent 6, …).
- **Existing databases**: migration or ops SQL should delete **`page`** rows **31** / **32** only after removing **`user_group_page`** (or equivalent) rows referencing those `page_id`s — confirm FK table names in [`information-table.ts`](src/lib/server/db/table/information-table/information-table.ts) before writing `DELETE`.

## Docs / i18n / tests

- **[`.cursor/skills/inventory-transactions-and-batch-flow/SKILL.md`](.cursor/skills/inventory-transactions-and-batch-flow/SKILL.md)**: remove SI/SR from approval narrative; note standalone Store Transfer / Stock Issue **pages** removed; GRN may still post transfers via server.
- **[`docs/inventory-transactions-test-cases.md`](docs/inventory-transactions-test-cases.md)**: drop or narrow sections that assume **`inventory/transfer`** and **`inventory/issue`** HTTP smoke tests; keep transfer/issue **tables** integrity notes if GRN still exercises transfers.
- **[`messages/en.json`](messages/en.json)**: remove **`inv_approval_config_module_si`** / **`inv_approval_config_module_sr`** if unused; remove any stock-issue / store-transfer **page-only** strings tied to deleted routes (grep `stock-issue`, `store-transfer`, `inv_transfer`, stock issue list copy).
- **`pnpm run paraglide`** after message edits.
- **Grep** `e2e/`, `src/` for links or tests to `/inventory/store-transfer` or `/inventory/stock-issue` and update/remove.

## Verification

- `pnpm run check` / `svelte-check`.
- `pnpm run check:ui-boundary` if touched paths matter.
- Confirm GRN “transfer to requesting store” (or equivalent) still succeeds—only manual transfer API removed.

## Relation to earlier “approval modules” analysis

- **Department Issue** still uses module **`DI`** at issuer store; **Receipt from store** still has **no** approval workflow.
- Removing **SI/SR** does **not** add Department Issue / Receipt modules; those remain separate follow-ups if needed.
