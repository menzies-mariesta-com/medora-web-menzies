# `item_batch` — Role & Suggested Improvements

This document complements [`grn-to-sale-price-examples.md`](./grn-to-sale-price-examples.md). It explains what `item_batch` is for in the current pricing architecture and lists practical follow-ups.

---

## What `item_batch` is for today

| Role | Detail |
|------|--------|
| **Stock lot identity** | `batch_no`, expiry, supplier, issue-unit cost |
| **Pricing provenance** | `goods_receipt_line_id` → sale-time formula reads **GRN line**, not batch price |
| **One cost lot per GRN line** | Migration `0091` — same label batch, different receipt terms → separate `item_batch` rows |

Batches are **only** created during GRN post via `findOrCreateItemBatch` in `grn.server.ts`. That is the intended model.

---

## Two different `purchase_price` values

| Table | Unit | Converted at GRN post? |
|-------|------|------------------------|
| `goods_receipt_line.purchase_price` | **Purchase unit** (`unit_id` on the line) | **No** — stored exactly as entered |
| `item_batch.purchase_price` | **Issue/stock unit** | **Yes** — `purchaseUnitPriceToIssueUnitPriceString` |

**Example:** 1 box = 100 tablets, user enters **100/box** on GRN.

| Storage | Value |
|---------|-------|
| `goods_receipt_line.purchase_price` | 100.00 (per box) |
| `item_batch.purchase_price` | 1.00 (per tablet) |

**Sale-time cost formula** uses `goods_receipt_line.purchase_price` with `received_qty` (both purchase unit). It does **not** read `item_batch.purchase_price`.

---

## Suggestions (by priority)

### 1. Fix the confusing “purchase price” label on stock (recommended)

`item_batch.purchase_price` is **per issue/stock unit**, but the stock page column is labeled “Purchase price” with no unit context (`stock/+page.svelte`).

Users may assume it is the same number they entered on GRN (per box/bottle). This is misleading.

**Recommendation:**

- Rename the column to something like **“Cost (per stock unit)”** and show `issueUnitName` in the header or cell.
- Optionally join `goods_receipt_line` in the stock lots API and expose **GRN purchase-unit price** as a second column for invoice reconciliation.

**Files involved:**

- `src/routes/(private)/heka/hospital/[hospital_id]/home/inventory/stock/+page.svelte`
- `src/routes/api/(private)/heka/hospital/[hospital_id]/home/inventory/stock/+server.ts`
- `src/lib/server/heka/inventory/stock.server.ts`
- `messages/en.json` (Paraglide keys)

---

### 2. Audit legacy batches without GRN provenance

Sale pricing **requires** `goods_receipt_line_id` on the batch. Without it, `computeSalePriceAtTransactionDb` returns:

```text
Batch has no goods receipt provenance for price calculation
```

**One-time audit query:**

```sql
SELECT id, item_id, batch_no, purchase_price, goods_receipt_line_id
FROM item_batch
WHERE goods_receipt_line_id IS NULL;
```

**If rows exist:**

- Re-run or extend the `0082` backfill (join `goods_receipt_line.batch_id` → set provenance; earliest line wins).
- Manually link edge cases where `batch_id` was never set on the GRN line.
- Stock from before provenance existed may block MO / DC / billing pricing until fixed.

**Reference migration:** `drizzle/0082_item_batch_grn_provenance.sql`

---

### 3. Do not use `item_batch.purchase_price` for pricing math

Keep the current separation:

| Purpose | Source |
|---------|--------|
| Cost formula (landed cost, denominator, markups) | `goods_receipt_line` (+ full note context) |
| Batch row price | Issue-unit cost for lot identity and stock display only |

**Avoid** wiring `item_batch.purchase_price` back into `computeSalePriceFromFormula` — it uses the wrong unit and can double-apply or misstate cost.

**Correct sale-time path:**

```text
item_batch.goods_receipt_line_id
  → loadGrnCostContextForLine
  → computeSalePriceFromFormula
```

---

### 4. Accept pre-0091 merged lots; re-split only if needed

Before migration `0091`, two GRNs with the same batch number and same issue-unit cost could share one `item_batch`. New GRNs get **separate cost lots** per `goods_receipt_line_id`.

**Old stock will not auto-split.** Only run a data migration if you have real cases where:

- The same batch label has different GRN costs, and
- Pricing today is wrong because they still share one batch row.

**Reference migration:** `drizzle/0091_item_batch_grn_line_identity.sql`

---

### 5. Optional schema clarity (later)

`item_batch.purchase_price` effectively means **issue-unit unit cost**. A future rename (e.g. `issue_unit_cost`) would reduce confusion. Not urgent if UI labels are fixed first.

**Optional constraint:** `goods_receipt_line_id NOT NULL` on new inserts (every batch today comes from GRN post).

---

### 6. Optional UX: live sale price on stock lots

Stock UI shows stored **cost** (issue unit). **Sale price** is computed only at transaction time from template + markups.

A **“Preview sale price”** per lot (module + store + assigned template) would help users compare cost vs retail without opening a transaction screen.

**Would call:** `previewSalePrice` in `sale-price.server.ts` (already exists for admin preview).

---

### 7. Reports / inventory valuation

For valuation or cost reports, prefer **GRN line landed cost** (or sale-time computed cost) over raw `item_batch.purchase_price`.

Batch price is per issue unit and may not match how finance thinks about “cost per box” on the supplier invoice.

---

## What you probably do not need to do

| Action | Why not |
|--------|---------|
| Remove `item_batch` | Still required for FEFO, `inv_stock` qty, batch picking |
| Store sale price on batch | Intentionally removed; price is snapshotted on transaction lines |
| Merge batches across GRN lines again | Would break per-receipt costing (post-0091 design) |

---

## Practical next steps

1. **Stock UI labeling** — clarify issue-unit cost vs GRN purchase-unit price (#1).
2. **Legacy provenance audit** — find and fix batches with `goods_receipt_line_id IS NULL` (#2).

Those two give the most value for the least risk.

---

## Related source files

| Topic | File |
|-------|------|
| Batch create / identity | `src/lib/server/heka/inventory/item-batch.server.ts` |
| GRN post → batch | `src/lib/server/heka/inventory/grn.server.ts` |
| Sale-time pricing | `src/lib/server/heka/inventory/sale-price.server.ts` |
| Load GRN context | `src/lib/server/heka/inventory/grn-cost-context.server.ts` |
| Purchase → issue price | `src/lib/server/heka/inventory/item-unit-inventory.server.ts` |
| Stock lots API | `src/lib/server/heka/inventory/stock.server.ts` |
| Provenance backfill | `drizzle/0082_item_batch_grn_provenance.sql` |
| Per-line cost lots | `drizzle/0091_item_batch_grn_line_identity.sql` |
| GRN → price examples | `docs/grn-to-sale-price-examples.md` |
| Architecture plan | `modify_grn_priciing_plan.md` |
