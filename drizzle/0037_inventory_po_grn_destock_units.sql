-- PO: store context for manual PR-free orders; nullable pr_id
ALTER TABLE "purchase_order" ADD COLUMN IF NOT EXISTS "store_id" integer;
--> statement-breakpoint
UPDATE "purchase_order" po
SET "store_id" = pr."store_id"
FROM "purchase_requisition" pr
WHERE po."pr_id" = pr."id" AND po."store_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "purchase_order" DROP CONSTRAINT IF EXISTS "purchase_order_pr_id_purchase_requisition_id_fk";
--> statement-breakpoint
ALTER TABLE "purchase_order" ALTER COLUMN "pr_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "purchase_order"
ADD CONSTRAINT "purchase_order_pr_id_purchase_requisition_id_fk"
FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisition"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_order"
ADD CONSTRAINT "purchase_order_store_id_store_id_fk"
FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "purchase_order" ALTER COLUMN "store_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_order_hospital_store_idx" ON "purchase_order" ("hospital_id", "store_id");
--> statement-breakpoint
-- GRN: optional PO, optional po line, supplier when no PO
ALTER TABLE "goods_receipt_note" ADD COLUMN IF NOT EXISTS "supplier_id" integer;
--> statement-breakpoint
UPDATE "goods_receipt_note" grn
SET "supplier_id" = po."supplier_id"
FROM "purchase_order" po
WHERE grn."po_id" = po."id" AND grn."supplier_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "goods_receipt_note" DROP CONSTRAINT IF EXISTS "goods_receipt_note_po_id_purchase_order_id_fk";
--> statement-breakpoint
ALTER TABLE "goods_receipt_note" ALTER COLUMN "po_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "goods_receipt_note"
ADD CONSTRAINT "goods_receipt_note_po_id_purchase_order_id_fk"
FOREIGN KEY ("po_id") REFERENCES "public"."purchase_order"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goods_receipt_note"
ADD CONSTRAINT "goods_receipt_note_supplier_id_supplier_id_fk"
FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goods_receipt_line" DROP CONSTRAINT IF EXISTS "goods_receipt_line_po_line_id_purchase_order_line_id_fk";
--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ALTER COLUMN "po_line_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "goods_receipt_line"
ADD CONSTRAINT "goods_receipt_line_po_line_id_purchase_order_line_id_fk"
FOREIGN KEY ("po_line_id") REFERENCES "public"."purchase_order_line"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_po_or_supplier_chk"
CHECK ("po_id" IS NOT NULL OR "supplier_id" IS NOT NULL);
--> statement-breakpoint
-- Reinterpret existing on-hand stock as issue units: prior GRNs stored purchase quantities.
-- Uses default item_unit_master (is_default_yes_no = 1) per item/hospital; skips items without a default IUM.
UPDATE "inv_stock" s
SET "quantity" = (
	s."quantity"::numeric
	* (
		ium."purchase_conversion_factor"::numeric
		/ NULLIF(ium."issue_conversion_factor"::numeric, 0)
	)
)::numeric(18, 6)
FROM "item_master_item_unit_master" link
INNER JOIN "item_unit_master" ium ON ium."id" = link."item_unit_master_id"
WHERE s."item_id" = link."item_master_id"
AND s."hospital_id" = link."hospital_id"
AND link."deleted_at" IS NULL
AND ium."deleted_at" IS NULL
AND ium."status_id" = 1
AND link."is_default_yes_no" = 1
AND s."deleted_at" IS NULL;
