-- PR cancelled status + document header audit / cancel columns

INSERT INTO "status_tagging" ("id", "name", "code", "sequence_no", "status_tagging_type_id")
VALUES (31, 'Cancelled', 'cancelled', 6, 3)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "purchase_requisition" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "purchase_requisition" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;
ALTER TABLE "purchase_requisition" ADD COLUMN IF NOT EXISTS "cancelled_by" text;
ALTER TABLE "purchase_requisition" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
ALTER TABLE "purchase_requisition" ADD COLUMN IF NOT EXISTS "cancel_reason" text;

DO $$ BEGIN
 ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "purchase_order" ADD COLUMN IF NOT EXISTS "approved_by" text;
ALTER TABLE "purchase_order" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;

DO $$ BEGIN
 ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "goods_receipt_note" ADD COLUMN IF NOT EXISTS "cancelled_by" text;
ALTER TABLE "goods_receipt_note" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
ALTER TABLE "goods_receipt_note" ADD COLUMN IF NOT EXISTS "cancel_reason" text;

DO $$ BEGIN
 ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "inv_store_transfer" ADD COLUMN IF NOT EXISTS "cancelled_by" text;
ALTER TABLE "inv_store_transfer" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
ALTER TABLE "inv_store_transfer" ADD COLUMN IF NOT EXISTS "cancel_reason" text;

DO $$ BEGIN
 ALTER TABLE "inv_store_transfer" ADD CONSTRAINT "inv_store_transfer_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "inv_stock_issue" ADD COLUMN IF NOT EXISTS "cancelled_by" text;
ALTER TABLE "inv_stock_issue" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
ALTER TABLE "inv_stock_issue" ADD COLUMN IF NOT EXISTS "cancel_reason" text;

DO $$ BEGIN
 ALTER TABLE "inv_stock_issue" ADD CONSTRAINT "inv_stock_issue_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
