-- Preserve original PR line requested qty separately from approved (quantity).
ALTER TABLE "purchase_requisition_line"
ADD COLUMN IF NOT EXISTS "requested_quantity" numeric(18, 0);

UPDATE "purchase_requisition_line"
SET "requested_quantity" = "quantity"
WHERE "requested_quantity" IS NULL;

ALTER TABLE "purchase_requisition_line"
ALTER COLUMN "requested_quantity" SET NOT NULL;
