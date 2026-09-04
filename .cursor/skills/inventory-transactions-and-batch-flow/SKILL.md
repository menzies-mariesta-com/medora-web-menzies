---
name: inventory-transactions-and-batch-flow
description: >-
  Documents the hospital-scoped inventory workflow (PR → multi-level approval → PO → GRN → item_batch + inv_stock), department indent (DI), department consumption (DC), store-scoped approval config (PR/PO/DI/GRN/DC modules), status_tagging usage, and FEFO consumption. GRN always requires batch identity fields per line. Use when implementing or debugging inventory, GRN, stock, batches, purchase requisitions/orders, department indents, department consumption, or related Drizzle schema/migrations/seeds/APIs in this repo.
---

# Inventory transactions and batch flow (Heka)

## When to load this skill

- Adding or changing **purchase requisition**, **purchase order**, **GRN**, **stock**, **transfer**, **issue**, **department consumption**, or **approval configuration** behavior.
- Touching **`item_batch`**, **`inv_stock`**, **`goods_receipt_line`**, or **`item_master`** (catalog).
- Writing migrations or seeds that affect inventory tables or **`status_tagging`** IDs for inventory document types.
- Mirroring new **SvelteKit routes** under `home/inventory` or `home/inventory-setup` per project rules.

## Project conventions (do not bypass)

- **Data path**: [`.cursor/rules/remote-api-pages-flow.mdc`](../../rules/remote-api-pages-flow.mdc) — `+page.svelte` → mirrored `+server.ts` → `$lib/server/heka/...` modules; UI types in `$lib/model/type`, not raw Drizzle types in components ([`.cursor/rules/app-development.mdc`](../../rules/app-development.mdc)).
- **AuthZ**: Every server entrypoint uses **`ensureCanAccessHospital`** (or inventory helpers that call it) with `hospital_id` from the route.
- **Workflow states**: Document lifecycle uses **`status_tagging`** + **`status_tagging_type`**, not ad-hoc status tables. Inventory type IDs and per-flow status IDs are mirrored in [`src/lib/model/enum/db-link.ts`](../../../src/lib/model/enum/db-link.ts) (`StatusTaggingTypeEnum`, `InvPrStatusTaggingEnum`, `InvPoStatusTaggingEnum`, `InvGrnStatusTaggingEnum`, etc.). **Any change to seeded IDs requires the same change in `db-link.ts`.**
- **Seeds**: [`src/lib/server/db/seed/information-table-seed.ts`](../../../src/lib/server/db/seed/information-table-seed.ts) includes inventory **`status_tagging_type` / `status_tagging`** (including **Department indent**, type id **8**, status ids **40–45**; **Department consumption**, type id **10**, status ids **50–53** per **`0050`**) and, in **section 7b**, idempotent **`inv_approval_level` / `inv_approval_log`** DDL: module **`CHECK`** aligned with migrations up through **`0051`** (**`GRN`**, **`DC`**) and the **partial unique** index from **0041**, so `pnpm db:seed` can fix approval schema when full `db:migrate` was not run (requires `inv_approval_level` to exist from an earlier migration or `db:push`).

## End-to-end business flow

```mermaid
flowchart LR
  subgraph setup [Inventory_setup]
    Store[store]
    Appr[inv_approval_level_assignee]
  end
  subgraph tx [Transactions]
    PR[purchase_requisition]
    PO[purchase_order]
    GRN[goods_receipt_note]
    Batch[item_batch]
    Stock[inv_stock]
    Xfer[inv_store_transfer]
    Iss[inv_stock_issue]
    DI[inv_department_indent]
  end
  Store --> Appr
  Store --> PR
  Appr --> PR
  Appr --> DI
  PR --> PO
  PO --> GRN
  GRN --> Batch
  GRN --> Stock
  Batch --> Stock
  Stock --> Xfer
  Stock --> Iss
```

1. **Approval configuration** (per hospital + store + **`module`** on `inv_approval_level`): codes are defined in [`src/lib/model/type/heka/inv-approval.type.ts`](../../../src/lib/model/type/heka/inv-approval.type.ts) as **`PR` | `PO` | `DI` | `GRN` | `DC`** (`INV_APPROVAL_MODULE_CODES`). UI: **Inventory Setup → Approval configuration** — each module has its own levels/assignees. **Wired in server today:** PR, PO, department indent (**`DI`**), department consumption (**`DC`**). **`GRN`** is used as a permission-style assignment check in some flows. `inv_approval_log` records actions (`InvApprovalActionEnum`). **Schema:** `inv_approval_level.module` and `inv_approval_log.module` are enforced with a DB `CHECK`; **partial unique index** on `(hospital_id, store_id, module, level) WHERE deleted_at IS NULL` so a level can be re-added after soft-delete. [`approval-config.server.ts`](../../../src/lib/server/heka/inventory/approval-config.server.ts) revives a soft-deleted row when recreating the same level instead of inserting a duplicate key.
2. **PR**: `purchase_requisition` has **`from_store_id`** and **`to_store_id`** (same branch, must differ) + lines; PR approvals use **`from_store_id`**. Optional line qty adjustments on approve.
3. **PO**: From an **approved** PR (allocates from PR line `qty_remaining`): `purchase_order.store_id` = PR **`to_store_id`** (central purchasing / destination), not `from_store_id`; `pr_id` set (`createPurchaseOrder`). **Manual PO** (`createPurchaseOrderDirect`): `pr_id` null, `store_id` must be the central purchasing store. Both paths live in [`po.server.ts`](../../../src/lib/server/heka/inventory/po.server.ts).
4. **GRN**: **PO-backed**: `goods_receipt_note.po_id` set; receipt **`store_id`** must equal the PR’s **`to_store_id`** when `pr_id` is present, or the PO’s **`store_id`** for manual POs. **Direct GRN** (no PO): `po_id` null, `supplier_id` + lines with `po_line_id` null — `createAndPostDirectGoodsReceipt` in [`grn.server.ts`](../../../src/lib/server/heka/inventory/grn.server.ts). Each line creates/links **`item_batch`**, and **`inv_stock.quantity` is in issue units** (via [`item-unit-inventory.server.ts`](../../../src/lib/server/heka/inventory/item-unit-inventory.server.ts)).
5. **UI — From store (navbar)**: On routes under `/heka/hospital/{id}/home/inventory` (not `inventory-setup`), the top bar can show a **From store** selector (cookie `heka_selected_inventory_from_store_id`, POST `set-selected-inventory-from-store`). PR create and manual PO / direct GRN default to this store where applicable. **Department consumption — New** (`inventory/department-consumption/new`): **`store_id` is fixed to that navbar From store** (readonly display); submit stays disabled until a store is selected, matching **department indent / New** “From store” behavior.
6. **Stock listing**: Aggregates from `inv_stock` (quantities in **issue units**); display joins default `item_unit_master` for the issue unit name. Lot view joins `item_batch`. **FEFO** = order by `item_batch.expiry_date ASC NULLS LAST`.
   - **Batch selection UX (stock issue UIs)**: Prefer a **batch/expiry table** (one row per `inv_stock` lot) rather than a batch search/select dropdown. Users enter **purchase-unit qty per batch**, UI validates against **issue-unit stock** by converting purchase→issue.
     - Reusable: [`InventoryBatchQtyPickTable.svelte`](../../../src/lib/component/own/local/private/heka/inventory/InventoryBatchQtyPickTable.svelte)
     - Conversion helper: [`purchase-issue-qty-convert.util.ts`](../../../src/lib/tool/inventory/purchase-issue-qty-convert.util.ts)

### UI pattern — implementing `InventoryBatchQtyPickTable` (detailed)

Use this pattern in **any stock-issuing UI** (Department consumption, Department issue, Stock issue, etc.) where users must choose **which batches** to consume.

#### Data model (client)

- **Draft line should store allocations (not a single batch/qty):**
  - `draftLine.batchAllocations: ConsumptionBatchAllocationDraft[]`
  - Each allocation row corresponds to a lot row from `/inventory/stock?mode=lots`:
    - `batchId`, `batchNo`, `expiryDate`, `stockIssueQty` (string)
    - `qtyPurchase` (string) user-entered in purchase unit

#### Sale pricing (transaction time)

- **GRN** stores cost only (`purchase_price` on line + issue-unit cost on `item_batch`). No sale/emp price at receipt.
- **Formula**: `inv_pricing_formula_template` + `inv_module_pricing_assignment` per branch + module (`MO`, `DC`, `BILLING`). Slot order v1: `COST → MSL → ITEM → STORE`.
- **Compute at post/dispense**: [`sale-price.server.ts`](../../../src/lib/server/heka/inventory/sale-price.server.ts) + [`sale-price-calculator.util.ts`](../../../src/lib/tool/inventory/sale-price-calculator.util.ts). Batch must have `goods_receipt_line_id` provenance.
- **GRN post order**: insert `goods_receipt_line` (nullable `batch_id`) → `findOrCreateItemBatch(..., goodsReceiptLineId)` → update line `batch_id`.
- **Snapshots**: Internal/external sales snapshot `unit_sale_price` in the assignment’s **price unit** (`PURCHASE` or `ISSUE` on `inv_module_pricing_assignment`); DC `emp_sale_price` is always per issue unit; OP billing uses **IS** assignment unit at sync time.

#### Hydration (client)

When item is picked (or prefilled + locked, e.g. From Indent flow):

1) **Hydrate item meta and choose a conversion (IUM):**
   - Fetch item detail: `/inventory-setup/item-master?id={itemId}`
   - Fetch IUM list: `/inventory-setup/item-master?mode=itemUnitMasters`
   - Filter IUM to the item’s allowed conversions, choose default, and set:
     - `draftLine.iumList = [chosen]`
     - `draftLine.itemUnitMasterId = chosen.id`

2) **Fetch lots for the current store + item:**
   - `GET /inventory/stock?mode=lots&storeId={storeId}&itemId={itemId}`
   - **Important:** only show lots with stock:
     - `rows.filter((r) => Number(r.quantity) > 1e-9)` (stock is in issue unit)
   - Map to allocations:
     - `stockIssueQty = String(r.quantity)`
     - `qtyPurchase = ''`

3) **Locked-item (indent) flows must still hydrate IUM:**
   - If `draftLine.lockItem === true` and `draftLine.itemId != null` but `draftLine.iumList.length === 0`,
     call the same `hydrateLineItemMeta(draftLine, draftLine.itemId)` used for free-pick flows.
   - Do **not** only refresh batches; you need IUM factors for validation.

Reference implementations:
- Consumption: [`ConsumptionLineDialogContent.svelte`](../../../src/lib/component/own/local/private/heka/inventory/department-consumption/ConsumptionLineDialogContent.svelte)
- Issue: [`DepartmentIssueLineDialogContent.svelte`](../../../src/lib/component/own/local/private/heka/inventory/department-issue/DepartmentIssueLineDialogContent.svelte)
- Medication order internal/external sales: [`medication-order-dispense.server.ts`](../../../src/lib/server/heka/medication-order/medication-order-dispense.server.ts) — deducts `inv_stock` on batch save via `addDeltaToInvStock`; lines store allocations in `medication_order_line_allocation`.

#### Rendering the table (client)

In the line dialog, render the table like:

- `bind:allocations={draftLine.batchAllocations}`
- `factors={iumFactors}` where `iumFactors = { purchaseConversionFactor, issueConversionFactor }`
- Pass labels for hints:
  - `purchaseUnitLabel={chosenIum.purchaseUnitName}`
  - `issueUnitLabel={chosenIum.issueUnitName}`

#### Validation rules (client)

On Save:

1) Require item + chosen IUM factors.
2) Require at least one allocation with `qtyPurchase > 0`.
3) For each allocation with qty:
   - Parse `qtyPurchase` number; must be finite and \(> 0\)
   - Convert to issue unit using `purchaseQtyToIssueQtyNumber(qp, pf, iff)`
   - Check `need <= stockIssueQty` (allow small epsilon only for display; server enforces ints)

#### Submitting (client → API)

Flatten each draft line allocations into **multiple API lines**:

- For each `allocation` where `qtyPurchase > 0`, submit:
  - `{ itemId, unitId: purchaseUnitId, quantity: qtyPurchase, batchId: allocation.batchId }`

This ensures the server can issue **exactly** the chosen batches (no FEFO guessing).

#### Reactivity + solved bugs (must keep)

Two bugs were fixed while adopting this component. Do not reintroduce them.

1) **Deep mutation doesn’t always update derived totals**
   - Bug: editing `allocations[rowIndex].qtyPurchase` directly can fail to trigger `$derived` recomputation.
   - Fix: the table reassigns the array on edits:
     - `allocations = allocations.map((a,i) => i===rowIndex ? { ...a, qtyPurchase: next } : a)`

2) **Stale value on input event (causes “Quantity” alert)**
   - Bug: using `oninput={() => onChange?.(value)}` can send stale `value`.
   - Fix: read from event target:
     - `oninput={(e) => onChange?.((e.currentTarget as HTMLInputElement).value)}`

Files containing these fixes:
- [`InventoryBatchQtyPickTable.svelte`](../../../src/lib/component/own/local/private/heka/inventory/InventoryBatchQtyPickTable.svelte)
- [`InventoryBatchQtyPickQtyCell.svelte`](../../../src/lib/component/own/local/private/heka/inventory/InventoryBatchQtyPickQtyCell.svelte)

7. **Transfer**: Lines are **batch-scoped**: `{ itemId, batchId, quantity, unitId }`; moves quantity between stores for the same `batch_id`.
8. **Issue**: Lines may omit **`batchId`** → auto **FEFO** across `inv_stock` rows for that item in the store; or set **`batchId`** for a single-batch deduction. Multiple `inv_stock_issue_line` rows may be inserted when FEFO spans batches.

## Schema locations

| Area | Drizzle file |
|------|----------------|
| PR/PO/GRN, approval, `item_batch`, `inv_stock`, transfer, issue | [`src/lib/server/db/table/information-table/inventory-transaction-table.ts`](../../../src/lib/server/db/table/information-table/inventory-transaction-table.ts) |
| Relations | [`src/lib/server/db/table/information-table/inventory-transaction-relation.ts`](../../../src/lib/server/db/table/information-table/inventory-transaction-relation.ts) |
| `item_master` | [`src/lib/server/db/table/information-table/information-table.ts`](../../../src/lib/server/db/table/information-table/information-table.ts) |
| Exported from | [`src/lib/server/db/schema.ts`](../../../src/lib/server/db/schema.ts) |

### Normalized batch + stock (critical)

- **`item_batch`**: Master row for a batch **identity**. After migration **`0073_item_master_manufacturer_text_drop_master.sql`**, uniqueness is **`item_batch_identity_uidx`** on `(hospital_id, item_id, batch_no, expiry_date, supplier_id, purchase_price)` with **`NULLS NOT DISTINCT`** (PostgreSQL **15+**). There is **no** `manufacturer_id` on batches or PO lines; manufacturer is **free text** on **`item_master.manufacturer_name`** only (for labels/reporting). Different supplier or purchase price still splits batches even when batch number and expiry match.
- **`inv_stock`**: **Quantity per store per batch** (`store_id`, `batch_id`, `quantity`, soft delete). Active rows: partial unique **`(store_id, batch_id) WHERE deleted_at IS NULL`** (see migration).
- **Legacy**: `inv_stock_lot` was **dropped** after migration **`0033_item_batch_normalized_stock.sql`**. Do not reintroduce it; extend `item_batch` / `inv_stock` instead.

### GRN batch capture

- Every item master line on GRN **must** supply `batch_no`, `expiry_date`, and `purchase_price`; see [`grn.server.ts`](../../../src/lib/server/heka/inventory/grn.server.ts).

## Server modules (under `src/lib/server/heka/inventory/`)

| Module | Role |
|--------|------|
| [`inventory-scope.server.ts`](../../../src/lib/server/heka/inventory/inventory-scope.server.ts) | Hospital access, store-in-hospital, staff id |
| [`approval-config.server.ts`](../../../src/lib/server/heka/inventory/approval-config.server.ts) | CRUD approval levels/assignees |
| [`approval-workflow.server.ts`](../../../src/lib/server/heka/inventory/approval-workflow.server.ts) | Max level, “can this staff approve this level?”, approval logs list |
| [`item-batch.server.ts`](../../../src/lib/server/heka/inventory/item-batch.server.ts) | `findOrCreateItemBatch`, `addDeltaToInvStock` |
| [`item-unit-inventory.server.ts`](../../../src/lib/server/heka/inventory/item-unit-inventory.server.ts) | Purchase → issue unit conversion for `inv_stock` |
| [`pr.server.ts`](../../../src/lib/server/heka/inventory/pr.server.ts) | PR CRUD + approval transitions |
| [`po.server.ts`](../../../src/lib/server/heka/inventory/po.server.ts) | PR-backed PO only; approval (by `store_id`) + send to supplier |
| [`grn.server.ts`](../../../src/lib/server/heka/inventory/grn.server.ts) | GRN post (PO path): receive into PR `to_store_id`, `goods_receipt_line`, `inv_stock` (issue qty), PO line cumulative |
| [`stock.server.ts`](../../../src/lib/server/heka/inventory/stock.server.ts) | Aggregated and lot listings |
| [`transfer.server.ts`](../../../src/lib/server/heka/inventory/transfer.server.ts) | Batch-wise inter-store moves (no standalone UI page) |
| [`department-indent.server.ts`](../../../src/lib/server/heka/inventory/department-indent.server.ts) | Department indent CRUD + **`DI`** multi-level approval |
| [`department-consumption.server.ts`](../../../src/lib/server/heka/inventory/department-consumption.server.ts) | Department consumption CRUD + **`DC`** multi-level approval (stock deduction when workflow reaches **Posted**) |

## HTTP API layout (mirror private routes)

Base: `/api/heka/hospital/{hospital_id}/home/...`

| Area | Example path |
|------|----------------|
| Approval config | `inventory-setup/approval-config` |
| PR | `inventory/purchase-requisition`, `.../approve`, `.../resubmit` |
| PO | `inventory/purchase-order` (POST: PR-backed body only) |
| GRN | `inventory/grn` (POST: `poId` + `storeId` = PR destination + lines for PO path) |
| Stock | `inventory/stock?mode=aggregated|lots` |
| Transfer | internal (no standalone `inventory/transfer` endpoint) |
| Department indent | `inventory/department-indent` ( **`DI`** approval from store via [`listDiApproverStoreLevelsForStaff`](../../../src/lib/server/heka/inventory/approval-workflow.server.ts)) |
| Department consumption | `inventory/department-consumption` (+ approve/cancel); **New** POST creates **pending** + consumption no.; **Approve** when pending; **`DC`** module |

## Migrations (order)

1. **`drizzle/0032_inventory_transactions.sql`**: Core inventory tables (before batch normalization), `store.is_central_store`, etc.
2. **`drizzle/0033_item_batch_normalized_stock.sql`**: `item_batch`, `inv_stock`, GRN line `batch_id`/`purchase_price`, migrate off `inv_stock_lot`, transfer/issue `batch_id`, drop `inv_stock_lot`. (Legacy `item_master.is_batch_required` was added here and removed in **`0074_item_master_drop_barcode_batch_required.sql`**.)
3. **`drizzle/0037_inventory_po_grn_destock_units.sql`**: `purchase_order.store_id` + nullable `pr_id`; `goods_receipt_note` nullable `po_id`, `supplier_id`, nullable `goods_receipt_line.po_line_id`; one-time `inv_stock` quantity conversion using default `item_unit_master`.
4. **`drizzle/0038_pr_inter_store_drop_central.sql`**: `purchase_requisition.from_store_id` / `to_store_id` (replaces `store_id`); drops `store.is_central_store` and the partial unique index.
5. **`drizzle/0039_store_type_hospital_config_grn_pricing_dept_indent.sql`**: `store_type`, `hospital_inventory_config`, GRN line pricing fields, `inv_department_indent`, **`inv_approval_level.module`** extended to include **`DI`**, department-indent **`status_tagging`** (type **8**, ids **40–45**).
6. **`drizzle/0040_inv_approval_modules_si_sr.sql`**: (historical) extended module `CHECK` with `SI` and `SR`.
7. **`drizzle/0041_inv_approval_level_active_unique.sql`**: replaces full unique index on approval levels with **partial unique** `WHERE deleted_at IS NULL`.
8. **`drizzle/0050_inv_department_consumption.sql`**: `inv_department_consumption` + lines; **`status_tagging_type`** id **10** / **`status_tagging`** **50–53**; extends **`inv_approval_level` / `inv_approval_log`** module **`CHECK`** with **`DC`**.
9. **`drizzle/0051_drop_si_sr_approval_modules.sql`**: removes `SI` / `SR` from module `CHECK` and deletes their approval rows.
**Manual SQL (no migration runner):** [`drizzle/manual_inv_approval_module_check.sql`](../../../drizzle/manual_inv_approval_module_check.sql) applies only the module `CHECK` updates in Neon/psql if needed.

## Manual QA reference

- [`docs/inventory-transactions-test-cases.md`](../../../docs/inventory-transactions-test-cases.md)

## Common pitfalls

- **Do not** use magic `status_tagging` numeric literals in new code without aligning to [`db-link.ts`](../../../src/lib/model/enum/db-link.ts).
- **GRN store**: Must equal the linked PR’s **`to_store_id`** (enforced in `grn.server.ts`).
- **Transfer/issue**: Lines reference **`item_batch.id`**, not old lot ids; validate `item_batch` belongs to hospital and matches `itemId`.
- **Concurrent stock**: Use transactions (already wrapped in post handlers) when updating `inv_stock` and documents together.
- **Approval module `CHECK`**: If inserts fail with check violation on `module` **`DI`** / **`GRN`** / **`DC`**, run pending migrations **0039+** (through **`0051`** as needed), or **`drizzle/manual_inv_approval_module_check.sql`**, or **`pnpm db:seed:information`** so section **7b** of the information seed updates constraints.
- **Department indent status**: **`InvDepartmentIndentStatusTaggingEnum`** in [`db-link.ts`](../../../src/lib/model/enum/db-link.ts) (e.g. **`PENDING` = 41**) must match **`status_tagging`** rows for type id **8**.
- **Department consumption status**: **`InvDepartmentConsumptionStatusTaggingEnum`** (**50–53**) must match **`status_tagging`** for type id **10** ([`0050`](../../../drizzle/0050_inv_department_consumption.sql)).

## Changelog (2026-05-04)

- **Department consumption — New page UX**: [`department-consumption/new/+page.svelte`](../../../src/routes/(private)/heka/hospital/[hospital_id]/home/inventory/department-consumption/new/+page.svelte) — consuming **`store_id`** comes **only** from the navbar **From store** (readonly); hint when unset.

## Changelog (2026-04-26)

- **Approval config UI** ([`approval-config/+page.svelte`](../../../src/routes/(private)/heka/hospital/[hospital_id]/home/inventory-setup/approval-config/+page.svelte)): module selector includes **PR**, **PO**, **DI** (department indent), **GRN**, **DC**; Paraglide keys under `inv_approval_config_*` in [`messages/en.json`](../../../messages/en.json).
- **Types:** [`inv-approval.type.ts`](../../../src/lib/model/type/heka/inv-approval.type.ts) — `INV_APPROVAL_MODULE_CODES`, `isInvApprovalModule`.
- **DB / seed:** Information seed **7b** applies `inv_approval` module checks + partial unique index; seed data includes department-indent **`status_tagging`** (**40–45**). Optional manual: [`manual_inv_approval_module_check.sql`](../../../drizzle/manual_inv_approval_module_check.sql).
- **Server:** [`approval-config.server.ts`](../../../src/lib/server/heka/inventory/approval-config.server.ts) — soft-delete **revive** on recreate; clearer handling for **`23514`** / **`23505`**.
