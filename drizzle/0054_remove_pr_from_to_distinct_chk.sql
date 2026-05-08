-- Allow purchase requisition within same store (from_store_id = to_store_id)
ALTER TABLE "purchase_requisition"
	DROP CONSTRAINT IF EXISTS "purchase_requisition_from_to_distinct_chk";

