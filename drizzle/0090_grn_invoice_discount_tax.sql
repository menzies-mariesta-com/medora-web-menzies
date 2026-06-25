ALTER TABLE "goods_receipt_note"
  ADD COLUMN IF NOT EXISTS "invoice_discount_amount" numeric(14, 2) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "invoice_discount_percent" numeric(8, 2) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "invoice_tax_amount" numeric(14, 2) NOT NULL DEFAULT '0',
  ADD COLUMN IF NOT EXISTS "invoice_tax_percent" numeric(8, 2) NOT NULL DEFAULT '0';
