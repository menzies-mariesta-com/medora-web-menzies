# `item_batch` — Role & Pricing (updated)

This document complements [`grn-to-sale-price-examples.md`](./grn-to-sale-price-examples.md).

## Current model (migration 0093)

| Role | Detail |
|------|--------|
| **Stock lot identity** | `batch_no`, `expiry`, `goods_receipt_line_id` (GRN-linked) |
| **Pricing source of truth** | `goods_receipt_line.purchase_price` only — **not** stored on `item_batch` |
| **Display at read time** | Stock lots API joins GRN line + converts to issue-unit cost |

`item_batch` has **no `purchase_price` column** (dropped in `0093_item_batch_drop_purchase_price.sql`).

### Batch identity

| Case | Unique key |
|------|------------|
| GRN-linked | `(hospital_id, item_id, batch_no, expiry_date, goods_receipt_line_id)` |
| Legacy (no GRN line) | `(hospital_id, item_id, batch_no, expiry_date, supplier_id)` |

Use **`goods_receipt_line_id`**, not `goods_receipt_note_id`, for identity — one cost lot per GRN line.

### Price display (stock lots API)

| Field | Source |
|-------|--------|
| `estimatedPurchasePrice` | Landed GRN cost per **issue (stock) unit** — line + invoice discount/tax, free qty in denominator; **no** pricing template or sale markups. |
| `purchaseUnitName` | Unit name from GRN line `unit_id` |

Implementation: `estimated-purchase-price.util.ts` → `computeEstimatedPurchasePricePerIssueUnit`.

### Legacy audit (still recommended)

```sql
SELECT id, item_id, batch_no, goods_receipt_line_id
FROM item_batch
WHERE goods_receipt_line_id IS NULL;
```

Batches without provenance cannot be sale-priced until linked.

---

## Related source files

| Topic | File |
|-------|------|
| Batch create / identity | `src/lib/server/heka/inventory/item-batch.server.ts` |
| Stock lot pricing | `src/lib/server/heka/inventory/stock-lot-pricing.server.ts` |
| Price conversion util | `src/lib/tool/inventory/purchase-issue-price-convert.util.ts` |
| Migrations | `0092`, `0093` |
| GRN → price examples | `docs/grn-to-sale-price-examples.md` |
