# GRN → Sale Price: Step-by-Step Examples

This document walks through how a **Goods Receipt Note (GRN)** becomes a **sale price** when stock is sold (medication order, department consumption, billing, etc.).

**Key idea:** GRN stores **cost facts only**. Sale price is computed **at transaction time** from those facts + a **pricing formula template** + **item** and **store** markups.

---

## 1. End-to-end pipeline

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ AT GRN POST (receipt)                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ goods_receipt_note  →  goods_receipt_line(s)  →  item_batch (cost lot)  │
│   • invoice disc/tax      • received_qty, free_qty, unit, price         │
│                           • line disc/tax                               │
│                           • NO sale_price saved                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ AT SALE / DISPENSE (transaction)                                        │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Pick batch (item_batch) — links to goods_receipt_line_id             │
│ 2. Resolve template for (hospital, branch, module)                      │
│ 3. Load full GRN note context (all lines + invoice charges)           │
│ 4. Convert free qty → purchase unit (if needed)                         │
│ 5. Compute COST per purchase unit                                       │
│ 6. Apply markups: MSL → ITEM → STORE (per template slot order)          │
│ 7. Convert purchase-unit price → issue-unit price (for stock UOM)       │
│ 8. Snapshot price on transaction line                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Code path (sale time):**


| Step                              | Module                                                                      |
| --------------------------------- | --------------------------------------------------------------------------- |
| Resolve batch + template          | `sale-price.server.ts` → `computeSalePriceAtTransactionDb`                  |
| Load GRN lines + convert free qty | `grn-cost-context.server.ts` → `loadGrnCostContextForLine`                  |
| Cost + markups                    | `sale-price-calculator.util.ts` → `computeSalePriceFromFormula`             |
| Landed cost / denominator         | `grn-pricing.util.ts` → `computeGrnCostPerUnit`                             |
| Free qty conversion               | `grn-free-qty-purchase.util.ts` → `freeQtyToPurchaseUnitQty`                |
| Purchase → issue price            | `item-unit-inventory.server.ts` → `purchaseUnitPriceToIssueUnitPriceString` |


---

## 2. What GRN stores (inputs to pricing)

### Per line (`goods_receipt_line`)


| Field                                  | Role in pricing                                               |
| -------------------------------------- | ------------------------------------------------------------- |
| `received_qty`                         | Paid quantity (line **purchase unit**)                        |
| `free_qty`                             | Bonus quantity (in `free_unit_id`, may differ from line unit) |
| `unit_id`                              | Line purchase unit                                            |
| `free_unit_id`                         | Unit of free qty (defaults to line unit if same)              |
| `purchase_price`                       | Price per purchase unit                                       |
| `discount_amount` / `discount_percent` | Line discount (fixed amount wins over %)                      |
| `tax_amount` / `tax_percent`           | Line tax (fixed amount wins over %)                           |


### Per note (`goods_receipt_note`)


| Field                                                  | Role in pricing                             |
| ------------------------------------------------------ | ------------------------------------------- |
| `invoice_discount_amount` / `invoice_discount_percent` | Header discount, **allocated across lines** |
| `invoice_tax_amount` / `invoice_tax_percent`           | Header tax, **allocated across lines**      |


### Per batch (`item_batch`)


| Field                   | Role                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| `goods_receipt_line_id` | Provenance — which GRN line this cost lot came from                   |
| `purchase_price`        | Stored for stock identity; sale-time cost is recomputed from GRN line |


**Not stored at GRN:** `sale_price`, `emp_sale_price` (removed from GRN flow).

---

## 3. Pricing formula template (flags)

Each template defines **how cost is built** and **which markups apply**.

### Cost basis flags


| Flag              | When `true` | Effect                                                   |
| ----------------- | ----------- | -------------------------------------------------------- |
| `includeDiscount` | Yes         | Numerator uses amount **after** line + invoice discounts |
| `includeTax`      | Yes         | Numerator adds line + invoice tax                        |
| `includeFreeQty`  | Yes         | Denominator = `received_qty + free_qty (purchase unit)`  |


### Markup slots (applied in `slotOrder`, default `COST → MSL → ITEM → STORE`)


| Slot      | Source                            | Formula step                                   |
| --------- | --------------------------------- | ---------------------------------------------- |
| **COST**  | GRN landed cost ÷ denominator     | Base (no markup)                               |
| **MSL**   | `template.mslMarkupPercent`       | `× (1 + MSL% / 100)`                           |
| **ITEM**  | `item_master.item_markup_percent` | `× (1 + item% / 100)` if `includeItemMarkup`   |
| **STORE** | `store.store_markup_percent`      | `× (1 + store% / 100)` if `includeStoreMarkup` |


### Human-readable formula (from template UI)

```text
cost = (line subtotal [− line discount] [− invoice discount] [+ line tax] [+ invoice tax])
       / [received qty]  OR  [received qty + free qty]

price = cost × (1 + MSL%) [× (1 + item%)] [× (1 + store%)]
```

> **Note:** “free qty” in the denominator is always in the **line purchase unit** after unit conversion (see §8).

---

## 4. Core formulas (numbered steps)

For one GRN line at sale time:

### Step A — Line subtotal

```text
line_subtotal = received_qty × purchase_unit_price
```

### Step B — Line discount (if `includeDiscount`)

```text
line_discount = discount_amount  if discount_amount > 0
              else line_subtotal × (discount_percent / 100)

after_line_discount = line_subtotal − line_discount
```

### Step C — Invoice discount allocation (if `includeDiscount`)

Across **all lines** on the note:

```text
grn_after_line_disc_sum = Σ (each line's after_line_discount)

invoice_discount_total = invoice_discount_amount  if amount > 0
                       else grn_after_line_disc_sum × (invoice_discount_percent / 100)

line's share = invoice_discount_total × (line's after_line_discount / grn_after_line_disc_sum)

after_all_discount = after_line_discount − line's share
```

### Step D — Line tax (if `includeTax`)

Tax base = `after_all_discount` when discount included, else `line_subtotal`.

```text
line_tax = tax_amount  if tax_amount > 0
         else tax_base × (tax_percent / 100)
```

### Step E — Invoice tax allocation (if `includeTax`)

Same proportional pattern as invoice discount, on the appropriate base per line.

```text
landed_line_total = after_all_discount + line_tax + invoice_tax_share
                  (or subtotal + taxes only when discount excluded)
```

### Step F — Denominator (purchase units)

```text
free_qty_purchase = convert(free_qty, free_unit_id → line purchase unit)

denominator = received_qty                          if includeFreeQty = false
            = received_qty + free_qty_purchase      if includeFreeQty = true
```

### Step G — Cost per purchase unit

```text
cost_per_purchase_unit = landed_line_total / denominator
```

### Step H — Sale price (markups)

```text
price = cost_per_purchase_unit
price = price × (1 + MSL% / 100)
price = price × (1 + item% / 100)   [if includeItemMarkup]
price = price × (1 + store% / 100)   [if includeStoreMarkup]
```

### Step I — Issue-unit price (for dispensing / stock UOM)

```text
issue_price = purchase_price × (issue_conversion_factor / purchase_conversion_factor)
```

Example: 1 box = 100 tablets → issue price per tablet = purchase price per box ÷ 100.

---

## 5. Example A — Simplest case (no discount, tax, or free qty)

**GRN line**


| Field          | Value     |
| -------------- | --------- |
| received_qty   | 10 boxes  |
| purchase_price | 100 / box |
| free_qty       | 0         |


**Template:** `includeDiscount=false`, `includeTax=false`, `includeFreeQty=false`, MSL=0%, item=0%, store=0%


| Step | Calculation | Result                   |
| ---- | ----------- | ------------------------ |
| A    | 10 × 100    | subtotal = **1,000**     |
| F    | denominator | **10**                   |
| G    | 1,000 ÷ 10  | cost = **100.00 / box**  |
| H    | no markups  | price = **100.00 / box** |


---

## 6. Example B — Line discount + line tax (no invoice charges)

**GRN line**


| Field           | Value      |
| --------------- | ---------- |
| received_qty    | 10         |
| purchase_price  | 100        |
| discount_amount | 50 (fixed) |
| tax_percent     | 10%        |


**Template:** `includeDiscount=true`, `includeTax=true`, `includeFreeQty=false`, MSL=0%


| Step | Calculation | Result                   |
| ---- | ----------- | ------------------------ |
| A    | 10 × 100    | subtotal = 1,000         |
| B    | 1,000 − 50  | after discount = **950** |
| D    | 950 × 10%   | line tax = **95**        |
| E    | 950 + 95    | landed = **1,045**       |
| F    | denominator | 10                       |
| G    | 1,045 ÷ 10  | cost = **104.50 / unit** |


This matches `computeLandedCostTotals` in tests.

---

## 7. Example C — Discount % instead of fixed amount

**Rule:** If `discount_amount > 0`, use amount; otherwise use percent.


| Field            | Value |
| ---------------- | ----- |
| received_qty     | 10    |
| purchase_price   | 100   |
| discount_amount  | 0     |
| discount_percent | 5%    |



| Step           | Result              |
| -------------- | ------------------- |
| subtotal       | 1,000               |
| discount       | 1,000 × 5% = **50** |
| after discount | **950**             |


Same rule applies to **tax** and **invoice** charges.

---

## 8. Example D — Free qty in denominator

### D1 — Free qty in same unit as received


| Field          | Value                       |
| -------------- | --------------------------- |
| received_qty   | 10 boxes                    |
| free_qty       | 2 boxes (`free_unit` = box) |
| purchase_price | 100                         |
| tax_percent    | 10%                         |


**Template:** `includeDiscount=true`, `includeTax=true`, `includeFreeQty=true`, MSL=0%


| Step               | Calculation         | Result          |
| ------------------ | ------------------- | --------------- |
| subtotal           | 10 × 100            | 1,000           |
| tax (no line disc) | 1,000 × 10%         | 100             |
| landed             |                     | **1,100**       |
| free_qty_purchase  | 2 boxes (same unit) | **2**           |
| denominator        | 10 + 2              | **12**          |
| cost               | 1,100 ÷ 12          | **91.67 / box** |


### D2 — Free qty in issue unit (unit conversion required)

**Item unit master:** 1 box (purchase) = 100 tablets (issue)  
`purchase_conversion_factor = 100`, `issue_conversion_factor = 1`


| Field          | Value               |
| -------------- | ------------------- |
| received_qty   | 10 boxes            |
| free_qty       | 500 tablets         |
| free_unit_id   | tablet (issue unit) |
| purchase_price | 100 / box           |
| tax_percent    | 10%                 |



| Step              | Calculation             | Result          |
| ----------------- | ----------------------- | --------------- |
| subtotal          | 10 × 100                | 1,000           |
| tax               | 1,000 × 10%             | 100             |
| landed            |                         | **1,100**       |
| free_qty_purchase | 500 tablets → 500 ÷ 100 | **5 boxes**     |
| denominator       | 10 + 5                  | **15**          |
| cost              | 1,100 ÷ 15              | **73.33 / box** |


**Wrong (old behaviour):** denominator = 10 + 500 = 510 → cost ≈ 2.16 (incorrect).

Conversion uses the same logic as GRN stock posting (`freeQtyToPurchaseUnitQty`).

---

## 9. Example E — Invoice discount and tax (multi-line GRN)

**GRN note — 2 lines + invoice charges**


| Line | received_qty | purchase_price | line disc | line tax |
| ---- | ------------ | -------------- | --------- | -------- |
| 1    | 10           | 100            | 0         | 0        |
| 2    | 5            | 20             | 0         | 0        |


**Invoice:** discount_amount = **110**, tax_percent = **0**

**Template:** `includeDiscount=true`, `includeTax=false`, `includeFreeQty=false`

### Line 1


| Step                    | Calculation           | Result    |
| ----------------------- | --------------------- | --------- |
| subtotal                | 10 × 100              | 1,000     |
| grn sum after line disc | 1,000 + 100           | 1,100     |
| invoice disc total      | 110                   |           |
| line 1 share            | 110 × (1,000 / 1,100) | **100**   |
| after all disc          | 1,000 − 100           | **900**   |
| denominator             | 10                    |           |
| cost                    | 900 ÷ 10              | **90.00** |


### Line 2


| Step                         | Calculation         | Result    |
| ---------------------------- | ------------------- | --------- |
| subtotal                     | 5 × 20              | 100       |
| line 2 share of invoice disc | 110 × (100 / 1,100) | **10**    |
| after all disc               | 100 − 10            | **90**    |
| cost                         | 90 ÷ 5              | **18.00** |


Each `item_batch` from its GRN line gets a **different** cost per unit even on the same note.

---

## 10. Example F — Full invoice stack (line + invoice disc/tax + free qty)

Single line (from sale-price calculator test):


| Field                   | Value          |
| ----------------------- | -------------- |
| received_qty            | 100            |
| free_qty                | 10 (same unit) |
| purchase_price          | 50             |
| line discount_percent   | 10%            |
| line tax_percent        | 7%             |
| invoice discount_amount | 200            |
| invoice tax_percent     | 5%             |


**Template:** all cost flags `true`, MSL=0%, item=0%, store=0%


| Step             | Calculation       | Result           |
| ---------------- | ----------------- | ---------------- |
| subtotal         | 100 × 50          | 5,000            |
| line discount    | 5,000 × 10%       | 500 → **4,500**  |
| invoice discount | fixed 200         | → **4,300**      |
| line tax         | 4,300 × 7%        | **301**          |
| invoice tax      | 4,300 × 5%        | **215**          |
| landed total     | 4,300 + 301 + 215 | **4,816**        |
| denominator      | 100 + 10          | **110**          |
| cost             | 4,816 ÷ 110       | **43.78 / unit** |


---

## 11. Example G — All markup slots

**GRN line:** Example A (cost = 100 / box)

**Template:** MSL=20%, `includeItemMarkup=true`, `includeStoreMarkup=true`  
**Item markup:** 10%  
**Store markup:** 5%


| Step         | Calculation | Result           |
| ------------ | ----------- | ---------------- |
| COST         | (from GRN)  | 100.00           |
| × MSL (20%)  | 100 × 1.20  | 120.00           |
| × ITEM (10%) | 120 × 1.10  | 132.00           |
| × STORE (5%) | 132 × 1.05  | **138.60 / box** |


Slot order follows `template.slotOrder` (default: COST → MSL → ITEM → STORE).  
If `includeItemMarkup=false`, the ITEM step is skipped (132.00 stays). Same for STORE.

---

## 12. Example H — `includeDiscount` / `includeTax` flag matrix

Same line: received=10, price=100, discount=50, tax%=10%  
→ sub=1,000, afterDisc=950, afterTax=1,045


| includeDiscount | includeTax | Numerator used              | Cost (÷10) |
| --------------- | ---------- | --------------------------- | ---------- |
| false           | false      | subtotal 1,000              | **100.00** |
| true            | false      | after discount 950          | **95.00**  |
| false           | true       | subtotal + tax on sub 1,100 | **110.00** |
| true            | true       | after tax 1,045             | **104.50** |


---

## 13. Example I — Purchase unit → Issue unit price

After Example G: **138.60 / box**

**Unit master:** 1 box = 100 tablets

```text
issue_price = 138.60 × (1 / 100) = 1.39 / tablet  (rounded 2 dp)
```

Stock displays and FEFO issue use **issue-unit** price; MO line totals may use purchase qty × purchase-unit price depending on module.

---

## 14. Example J — One physical batch, two cost lots

Same batch number + expiry from supplier, but **different GRN lines** (different purchase price or invoice allocation):


| GRN line | purchase_price | item_batch                                 |
| -------- | -------------- | ------------------------------------------ |
| Line A   | 100            | batch id 101 (`goods_receipt_line_id` = A) |
| Line B   | 120            | batch id 102 (`goods_receipt_line_id` = B) |


At sale, the picked batch determines which GRN line feeds the formula → **different sale prices** for the same batch number on the label.

---

## 15. Template assignment at sale time

```text
(hospital_id, branch_id from store, module code e.g. MO | DC | Billing)
        ↓
inv_module_pricing_assignment  →  formula_template_id
        ↓
inv_pricing_formula_template   →  flags + MSL% + slot order
        +
item_master.item_markup_percent
        +
store.store_markup_percent
```

If no assignment exists, the hospital **system default** template is used.

---

## 16. Quick reference — what each flag changes


| Situation                         | What to check                                                      |
| --------------------------------- | ------------------------------------------------------------------ |
| Price too high vs invoice         | Is `includeTax` on? Is invoice tax allocated?                      |
| Free goods not lowering unit cost | Is `includeFreeQty` on? Is free qty converted to purchase unit?    |
| Same batch no, different prices   | Different `goods_receipt_line_id` / cost lots                      |
| Line vs header discount           | Line applied first; header prorated on after-line-discount amounts |
| Fixed vs % discount/tax           | Fixed **amount** wins when > 0                                     |
| Markup missing                    | Check `includeItemMarkup` / `includeStoreMarkup` on template       |
| “Batch has no GRN provenance”     | Legacy batch without `goods_receipt_line_id` cannot be priced      |


---

## 17. Related source files


| Topic                     | File                                                       |
| ------------------------- | ---------------------------------------------------------- |
| Landed cost + denominator | `src/lib/tool/inventory/grn-pricing.util.ts`               |
| Formula + markups         | `src/lib/tool/inventory/sale-price-calculator.util.ts`     |
| Free qty conversion       | `src/lib/tool/inventory/grn-free-qty-purchase.util.ts`     |
| Load GRN context at sale  | `src/lib/server/heka/inventory/grn-cost-context.server.ts` |
| Sale-time orchestration   | `src/lib/server/heka/inventory/sale-price.server.ts`       |
| Formula display text      | `src/lib/tool/inventory/pricing-formula-display.util.ts`   |
| Architecture plan         | `modify_grn_priciing_plan.md`                              |


---

*Generated for the Heka inventory pricing engine. Numbers are rounded to 2 decimal places in final prices (`toFixed(2)`).*