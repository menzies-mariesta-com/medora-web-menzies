-- Snapshot item_batch.emp_sale_price (per issue unit) when department consumption is posted.

ALTER TABLE "inv_department_consumption_line"
	ADD COLUMN IF NOT EXISTS "emp_sale_price" numeric(14, 2);
