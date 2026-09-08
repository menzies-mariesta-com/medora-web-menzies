# Inventory transactions — manual test cases

This document supports QA and regression for hospital-scoped inventory: **PR → store-based approval → PO → approval → GRN → batch-level stock (`item_batch` + `inv_stock`) → transfer / issue**, plus **department consumption (`DC`)**.

**Prerequisites**

- Run migrations `drizzle/0032_inventory_transactions.sql` and **`drizzle/0033_item_batch_normalized_stock.sql`** (PostgreSQL **15+** required for `item_batch` unique index `NULLS NOT DISTINCT`), then apply **all subsequent `drizzle/` migrations through head**. In particular, **`0073_item_master_manufacturer_text_drop_master.sql`** removes the **`manufacturer`** master table and **`manufacturer_id`** from PO lines / **`item_batch`**; batch identity becomes **`item_batch_identity_uidx`** on `(hospital_id, item_id, batch_no, expiry_date, supplier_id, purchase_price)` only.
- For **department indents**, **`inv_approval_level.module = DI`**, **`DC`** (department consumption), **`GRN`** on approvals, and **`SI` / `SR`**: apply **`0039`**+ through **`0050`** as applicable, or ensure **`pnpm db:seed:information`** has run (seed **7b** aligns `inv_approval_level` / `inv_approval_log` module `CHECK` and the partial unique index; see [`.cursor/skills/inventory-transactions-and-batch-flow/SKILL.md`](../.cursor/skills/inventory-transactions-and-batch-flow/SKILL.md)).
- Apply seeds so `status_tagging_type` **3–10** and `status_tagging` **9–30**, **40–45** (department indent), **46–49** (department issue), and **50–53** (department consumption) exist where needed; verify they match `src/lib/model/enum/db-link.ts` (`Inv*StatusTaggingEnum`, `StatusTaggingTypeEnum`, `InvDepartmentIndentStatusTaggingEnum`, `InvDepartmentConsumptionStatusTaggingEnum`).
- At least one **branch**, **store** (mark one store **central** per branch via Inventory Setup → Stores), **item_master** (GRN always requires **batch number, expiry, and purchase price** per line; optional **manufacturer** is **free text** on the item only via **`item_master.manufacturer_name`**; optional **`expiry_alert_lead_days`** overrides the hospital default expiring-soon window), **unit**, **supplier**, and **staff** linked to the acting **user**.
- Module **10 (Inventory)** and child pages seeded; assign **user_group** / page permissions so test users can open the new routes.

**API base** (replace placeholders):

`/api/medora/hospital/{hospital_id}/home/...`

---

## 1. Approval configuration

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| AC-1 | Create levels and assignees | `GET`/`POST` approval-config API: `inventory-setup/approval-config` — add level 1 and 2 for store A, module `PR`, assign different staff to each level. Repeat for module `PO`. Optionally configure **`DI`**, **`DC`**, **`GRN`**, **`SI`**, **`SR`** the same way (codes: [`inv-approval.type.ts`](../src/lib/model/type/medora/inv-approval.type.ts)). | Rows in `inv_approval_level` / `inv_approval_assignee`; list API returns grouped levels with staff. |
| AC-2 | Duplicate level same store+module | Attempt second **active** row with same `(hospital, store, module, level)` (or recreate after **delete** should succeed if only one row is active — partial unique on `deleted_at IS NULL`). | Rejected for duplicate **active** level; or revive path after delete per server behavior. |
| AC-3 | Cross-hospital isolation | User with access only to hospital H1 calls API with H2 `hospital_id`. | 403 / not found per `ensureCanAccessHospital` pattern. |
| AC-4 | No config | Submit PR for store with **no** approval levels for `PR`. | Appropriate error when workflow needs max level > 0 (or document behavior if zero levels allowed). |

**UI**: Inventory Setup → Approval Config — select store/module, verify levels and assignees display consistently with API.

---

## 2. Purchase requisition (PR)

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| PR-1 | Create and list | `POST` `inventory/purchase-requisition` with `store_id`, lines (`item_id`, `quantity`, `unit_id`). `GET` list with pagination. | PR in `pending` (or as implemented), `current_level` = 1; lines persisted. |
| PR-2 | Edit lock — pending | While status is **pending**, attempt line update via API. | Rejected (403/400). |
| PR-3 | Edit allowed | In **draft**, **sent_back**, or **rejected** (per `EDITABLE_PR_STATUSES`), update lines. | Success; quantities consistent. |
| PR-4 | Multi-level approve | Two levels configured; approver at level 1 **APPROVED**; then level 2 **APPROVED**. | After step 1: `current_level` increments; after step 2: `status_tagging_id` = **approved** (id 11). |
| PR-5 | Reject | Approver **REJECTED**. | Status **rejected** (12); log row with action REJECTED. |
| PR-6 | Send back | Approver **SENT_BACK**. | Status **sent_back** (13); `current_level` reset for resubmit flow; log present. |
| PR-7 | Resubmit | Call resubmit endpoint after send-back/reject. | Returns to pending / level 1 per implementation. |
| PR-8 | Wrong approver | User not in `inv_approval_assignee` for current level acts. | 403. |
| PR-9 | Partial quantity approval | On **APPROVED**, pass per-line adjusted quantities (lower than requested, > 0). | Lines updated; log may store adjustment payload. |
| PR-10 | Partial qty invalid | Adjust qty to 0 or above prior qty. | Validation error. |
| PR-11 | Audit log | After each action, `GET` detail or logs. | `inv_approval_log` rows: correct `module` PR, `level`, `action` (enum matches `InvApprovalActionEnum`). |

**UI**: PR list; approve page with `?prId=` — actions and log visibility.

---

## 3. Purchase order (PO)

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| PO-1 | Blocked until PR approved | Create PO while PR is pending/rejected. | Rejected. |
| PO-2 | Create from approved PR | `POST` `inventory/purchase-order` with `pr_id`, `supplier_id`, lines capped by PR **remaining** qty. | PO created; PR line remaining / allocation updated. |
| PO-3 | Supplier required | Omit `supplier_id`. | Validation error. |
| PO-4 | Qty cap | PO line qty > PR remaining. | Rejected. |
| PO-5 | Multi-PO partial | Create first PO for part of PR line; second PO for remainder. | Both succeed; total ordered ≤ PR approved qty. |
| PO-6 | PO approval chain | Same pattern as PR using store’s **PO** levels. | pending → level progression → **approved** (16). |
| PO-7 | Send to supplier | `POST` `inventory/purchase-order/send` when approved. | Status moves toward **sent_to_supplier** (19) per rules. |
| PO-8 | Resubmit | After PO **sent_back** / **rejected**, resubmit endpoint. | Workflow resets appropriately. |

---

## 4. Goods receipt (GRN) and stock

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| GRN-1 | Against approved / sent PO | Post GRN only when PO status allows receiving. | Otherwise rejected. |
| GRN-2 | Receipt cap | `purchased_qty` over PO line open qty. | Rejected in same transaction. |
| GRN-3 | Batch master + stock | Post lines with `batch_no`, `expiry_date`, and `purchase_price` (required for every item). | `item_batch` row (unique on hospital, item, batch_no, expiry, supplier_id, purchase_price per **`item_batch_identity_uidx`** after **0073**); `goods_receipt_line.batch_id` + `purchase_price`; `inv_stock` incremented for `(store_id, batch_id)`. |
| GRN-3b | Batch identity split | Same `batch_no` + expiry but different `purchase_price` or resolved **supplier_id** so the composite unique key differs. | Distinct `item_batch` rows (split costing). |
| IM-1 | GRN batch fields | Post GRN line without `batch_no`, `expiry_date`, or `purchase_price`. | Rejected for that line (400). |
| GRN-4 | Central store | GRN `store_id` must be **central** store for branch (if enforced). | Non-central rejected or documented exception. |
| GRN-5 | Idempotency / double post | Post same GRN line twice with overlapping qty. | Second post rejected or no over-receipt. |
| GRN-6 | PO / PR receipt state | After post, PO status **partially_received** / **closed** as appropriate; PR cumulative receipt updated if implemented. | Consistent header/line state. |
| GRN-7 | Concurrent post | Two parallel posts for same PO line (stress). | One succeeds or both valid without negative remaining; DB transaction prevents corruption. |

**Stock**: `GET` `inventory/stock?mode=aggregated|lots` — totals by store+item; **lots** joins `inv_stock` to `item_batch` (batch id, batch_no, expiry, purchase_price), ordered by expiry (FEFO).

---

## 5. Store transfer and stock issue (server/internal)

| ID | Case | Steps | Expected |
| --- | --- | --- |
| TR-1 | Batch-wise transfer | Post a flow that triggers store transfer (e.g. GRN auto transfer if applicable). | `inv_stock` decreased at source and increased at destination for same `batch_id`. |
| TR-2 | Insufficient stock | Transfer qty > `inv_stock.quantity` for that store+batch. | Rejected. |
| IS-1 | FEFO issue | Post a flow that issues stock (when applicable in your deployment). | Consumes from earliest `item_batch.expiry` first; multiple `inv_stock_issue_line` rows if spanning batches. |
| IS-1b | Explicit batch | Issue a single specified batch. | Deducts only that batch; one issue line. |
| IS-2 | Insufficient stock | Issue qty > available. | Rejected. |
| SC-1 | Hospital / store scope | Use `store_id` from another hospital or wrong branch. | Rejected via scope checks. |
| SC-2 | Batch traceability | `inv_store_transfer_line.batch_id` / `inv_stock_issue_line.batch_id` reference `item_batch`. | Traceable to GRN-derived batch. |

---

## 5b. Department consumption (DC)

Apply **`drizzle/0050_inv_department_consumption.sql`** (and seeds above for type **10** / ids **50–53**). API: `inventory/department-consumption` (+ approve/cancel as exposed).

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| DC-1 | UI — store locked on **New** | Open **`…/inventory/department-consumption/new`**. Set **From store** in the top bar to store A; refresh if needed. | **From store** on the form shows store A’s name **readonly** (no dropdown). |
| DC-2 | UI — no navbar store | Clear **From store** (or never select one); open **New**. | Hint explains changing **From store** in the top bar; **Submit** disabled until a store is selected. |
| DC-3 | Submit for approval | With navbar store set, add lines and **Submit for approval** on **New**. | Record created **pending approval** with **`consumption_no`**; **Approve** / **Reject** are separate (approvers only when pending). |
| DC-4 | UI — batch selection table | In **New**, add/edit a line: pick an item that has multiple batches in stock. | Modal shows **batch rows** (Batch, Expiry, Stock, **EMP sale price** per issue unit) and per-row qty inputs; no batch dropdown. |
| DC-5 | UI — multi-batch quantities | Enter qty in purchase unit across 2+ batches and save the line; submit the document. | POST payload contains **multiple DC lines** (one per batch with qty) for the same item; server accepts if stock is sufficient. |
| DC-6 | UI — qty exceeds stock (conversion-aware) | Enter a purchase-unit qty that (after conversion) exceeds available stock for a batch row. | Save / submit is blocked with a user-facing error; the offending row is visually highlighted. |
| DC-7 | EMP price snapshot on post | Apply **`drizzle/0076_inv_department_consumption_line_emp_sale_price.sql`**. GRN stock with distinct sale vs EMP prices; create DC, approve through all levels until **Posted**. | Detail lines show **EMP sale price** (per issue unit) matching `item_batch.emp_sale_price` at post time; `inv_department_consumption_line.emp_sale_price` populated in DB. Pending docs show `—` until posted. |

---

## 6. Regression and data integrity

| ID | Case | Expected |
| --- | --- | --- |
| R-1 | FKs to masters | PR/PO/GRN lines reference valid `item_master`, `unit`, `supplier`, `store`; `inv_stock.batch_id` → `item_batch`. (No **`manufacturer`** table; manufacturer label is optional text on **`item_master`** only.) |
| R-2 | Workflow tagging type | Status transitions only use `status_tagging` rows whose `status_tagging_type_id` matches PR (3), PO (4), GRN (5), transfer (6), issue (7), department indent (8), department issue (9), department consumption (10). |
| R-3 | Soft delete | Deleted PR/PO not listed; approval config respects `deleted_at` where applicable; `inv_stock` uses partial unique on `(store_id, batch_id)` for active rows. |
| R-4 | Store central uniqueness | Only one `is_central_store = true` per `branch_id` (partial unique index). |

---

## 7. Navigation and i18n

| ID | Case | Expected |
| --- | --- | --- |
| NAV-1 | Module visibility | Users with Inventory module see subnav: PR, PO, GRN, Stock, Department indent, Department issue, Receipt from store, Department consumption. |
| NAV-2 | Paraglide | New UI strings resolve from `messages/en.json` (no hard-coded user-visible English in new components). |

---

## 8. Report exports (CSV / Excel / PDF / Print)

**Movement log**, **Low stock**, and **Expired / expiring** export from the **MenziesTable toolbar** (client-side fetch of JSON, then CSV / Excel / PDF / Print). Column header filters reload data from the API (`filter_<columnId>` query params).

| ID | Case | Steps | Expected |
| --- | --- | --- | --- |
| REP-1 | Movement date range | Open **Movement log**; set date from/to. | Table reloads automatically with movements in that date range. |
| REP-2 | Report column filter | On movement, low stock, or expired report; use a column header filter. | Table reloads from API (backend search). |
| REP-3 | Report in-table export | With filters applied, use **CSV / Excel / PDF / Print** in the MenziesTable toolbar. | Export re-fetches JSON with current filters (up to 10,000 rows). |
| REP-4 | Export row cap | Export with filters that would exceed 10,000 rows (if test data allows). | API returns at most 10,000 rows; export matches. |

---

## Document history

- Initial version aligned with implementation under `src/lib/server/medora/inventory/` and routes `home/inventory/**`, `home/inventory-setup/approval-config`.
- **2026-05-04**: Section **5b** (department consumption UI/API smoke cases); prerequisites / AC-1 / R-2 aligned with migration **`0050`** and `InvDepartmentConsumptionStatusTaggingEnum`.
