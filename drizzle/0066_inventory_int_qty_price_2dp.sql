DO $$
BEGIN
  -- Preflight: reject fractional quantities (you will clean data first)
  IF EXISTS (SELECT 1 FROM inv_stock WHERE quantity <> trunc(quantity)) THEN
    RAISE EXCEPTION 'inv_stock.quantity contains fractional values';
  END IF;
  IF EXISTS (SELECT 1 FROM purchase_requisition_line WHERE quantity <> trunc(quantity) OR qty_remaining <> trunc(qty_remaining)) THEN
    RAISE EXCEPTION 'purchase_requisition_line quantity contains fractional values';
  END IF;
  IF EXISTS (SELECT 1 FROM purchase_order_line WHERE quantity <> trunc(quantity) OR qty_received_cumulative <> trunc(qty_received_cumulative)) THEN
    RAISE EXCEPTION 'purchase_order_line quantity contains fractional values';
  END IF;
  IF EXISTS (SELECT 1 FROM goods_receipt_line WHERE received_qty <> trunc(received_qty) OR free_qty <> trunc(free_qty)) THEN
    RAISE EXCEPTION 'goods_receipt_line quantities contain fractional values';
  END IF;
  IF EXISTS (SELECT 1 FROM inv_store_transfer_line WHERE quantity <> trunc(quantity)) THEN
    RAISE EXCEPTION 'inv_store_transfer_line.quantity contains fractional values';
  END IF;
  IF EXISTS (SELECT 1 FROM inv_stock_issue_line WHERE qty <> trunc(qty)) THEN
    RAISE EXCEPTION 'inv_stock_issue_line.qty contains fractional values';
  END IF;
  IF EXISTS (SELECT 1 FROM inv_department_indent_line WHERE quantity <> trunc(quantity) OR qty_issued <> trunc(qty_issued)) THEN
    RAISE EXCEPTION 'inv_department_indent_line quantities contain fractional values';
  END IF;
  IF EXISTS (SELECT 1 FROM inv_department_indent_line_alloc WHERE quantity <> trunc(quantity)) THEN
    RAISE EXCEPTION 'inv_department_indent_line_alloc.quantity contains fractional values';
  END IF;
  IF EXISTS (SELECT 1 FROM inv_department_issue_line WHERE quantity <> trunc(quantity) OR qty_issued <> trunc(qty_issued)) THEN
    RAISE EXCEPTION 'inv_department_issue_line quantities contain fractional values';
  END IF;
  IF EXISTS (SELECT 1 FROM inv_department_issue_line_alloc WHERE quantity <> trunc(quantity)) THEN
    RAISE EXCEPTION 'inv_department_issue_line_alloc.quantity contains fractional values';
  END IF;
  IF EXISTS (SELECT 1 FROM inv_department_consumption_line WHERE quantity <> trunc(quantity)) THEN
    RAISE EXCEPTION 'inv_department_consumption_line.quantity contains fractional values';
  END IF;
END $$;

-- Quantities: enforce integer semantics (numeric(...,0))
ALTER TABLE inv_stock
  ALTER COLUMN quantity TYPE numeric(18,0) USING trunc(quantity);

ALTER TABLE purchase_requisition_line
  ALTER COLUMN quantity TYPE numeric(18,0) USING trunc(quantity),
  ALTER COLUMN qty_remaining TYPE numeric(18,0) USING trunc(qty_remaining);

ALTER TABLE purchase_order_line
  ALTER COLUMN quantity TYPE numeric(18,0) USING trunc(quantity),
  ALTER COLUMN qty_received_cumulative TYPE numeric(18,0) USING trunc(qty_received_cumulative),
  ALTER COLUMN unit_price TYPE numeric(14,2) USING round(unit_price::numeric, 2);

ALTER TABLE goods_receipt_line
  ALTER COLUMN received_qty TYPE numeric(18,0) USING trunc(received_qty),
  ALTER COLUMN free_qty TYPE numeric(18,0) USING trunc(free_qty),
  ALTER COLUMN purchase_price TYPE numeric(14,2) USING round(purchase_price::numeric, 2),
  ALTER COLUMN discount_amount TYPE numeric(14,2) USING round(discount_amount::numeric, 2),
  ALTER COLUMN discount_percent TYPE numeric(8,2) USING round(discount_percent::numeric, 2),
  ALTER COLUMN tax_amount TYPE numeric(14,2) USING round(tax_amount::numeric, 2),
  ALTER COLUMN tax_percent TYPE numeric(8,2) USING round(tax_percent::numeric, 2),
  ALTER COLUMN sale_price TYPE numeric(14,2) USING round(sale_price::numeric, 2),
  ALTER COLUMN emp_sale_price TYPE numeric(14,2) USING round(emp_sale_price::numeric, 2);

ALTER TABLE goods_receipt_note
  ALTER COLUMN invoice_amount TYPE numeric(14,2) USING round(invoice_amount::numeric, 2);

ALTER TABLE item_batch
  ALTER COLUMN purchase_price TYPE numeric(14,2) USING round(purchase_price::numeric, 2),
  ALTER COLUMN sale_price TYPE numeric(14,2) USING round(sale_price::numeric, 2),
  ALTER COLUMN emp_sale_price TYPE numeric(14,2) USING round(emp_sale_price::numeric, 2);

ALTER TABLE inv_store_transfer_line
  ALTER COLUMN quantity TYPE numeric(18,0) USING trunc(quantity);

ALTER TABLE inv_stock_issue_line
  ALTER COLUMN qty TYPE numeric(18,0) USING trunc(qty);

ALTER TABLE inv_department_indent_line
  ALTER COLUMN quantity TYPE numeric(18,0) USING trunc(quantity),
  ALTER COLUMN qty_issued TYPE numeric(18,0) USING trunc(qty_issued);

ALTER TABLE inv_department_indent_line_alloc
  ALTER COLUMN quantity TYPE numeric(18,0) USING trunc(quantity);

ALTER TABLE inv_department_issue_line
  ALTER COLUMN quantity TYPE numeric(18,0) USING trunc(quantity),
  ALTER COLUMN qty_issued TYPE numeric(18,0) USING trunc(qty_issued);

ALTER TABLE inv_department_issue_line_alloc
  ALTER COLUMN quantity TYPE numeric(18,0) USING trunc(quantity);

ALTER TABLE inv_department_consumption_line
  ALTER COLUMN quantity TYPE numeric(18,0) USING trunc(quantity);

