ALTER TABLE "goods_receipt_note"
  ADD COLUMN IF NOT EXISTS "invoice_no" varchar(128),
  ADD COLUMN IF NOT EXISTS "invoice_date" date,
  ADD COLUMN IF NOT EXISTS "invoice_amount" numeric(14,4),
  ADD COLUMN IF NOT EXISTS "invoice_photo_url" text;

