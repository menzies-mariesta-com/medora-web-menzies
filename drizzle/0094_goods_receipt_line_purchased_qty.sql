-- Rename GRN line paid quantity: received_qty → purchased_qty (excludes free qty).

ALTER TABLE goods_receipt_line
	RENAME COLUMN received_qty TO purchased_qty;
