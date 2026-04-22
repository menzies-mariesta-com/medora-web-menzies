-- PO No (prefix-driven), same pattern as purchase_requisition.pr_no.

ALTER TABLE "purchase_order"
ADD COLUMN IF NOT EXISTS "po_no" varchar(128);

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_order_hospital_po_no_uidx"
ON "purchase_order" ("hospital_id", "po_no")
WHERE "po_no" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "purchase_order_po_no_idx"
ON "purchase_order" ("po_no");
