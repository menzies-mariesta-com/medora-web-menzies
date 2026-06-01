-- Medication order: stock allocations, sale qty/price, remarks, external payment

ALTER TABLE "medication_order_batch"
	ADD COLUMN IF NOT EXISTS "batch_remarks" text;

ALTER TABLE "medication_order_line"
	ADD COLUMN IF NOT EXISTS "item_unit_master_id" integer,
	ADD COLUMN IF NOT EXISTS "issue_qty_purchase" numeric(18, 6),
	ADD COLUMN IF NOT EXISTS "unit_sale_price" numeric(14, 2),
	ADD COLUMN IF NOT EXISTS "line_remarks" text;

DO $$ BEGIN
 ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_item_unit_master_id_item_unit_master_id_fk" FOREIGN KEY ("item_unit_master_id") REFERENCES "public"."item_unit_master"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "medication_order_line_allocation" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" integer NOT NULL,
	"batch_id" integer NOT NULL,
	"qty_purchase" numeric(18, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "medication_order_line_allocation_line_id_medication_order_line_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."medication_order_line"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "medication_order_line_allocation_batch_id_item_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "medication_order_line_allocation_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "medication_order_line_allocation_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "medication_order_line_allocation_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);

CREATE INDEX IF NOT EXISTS "medication_order_line_allocation_line_id_idx" ON "medication_order_line_allocation" ("line_id");
CREATE INDEX IF NOT EXISTS "medication_order_line_allocation_batch_id_idx" ON "medication_order_line_allocation" ("batch_id");

CREATE TABLE IF NOT EXISTS "medication_order_batch_payment" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"batch_id" integer NOT NULL,
	"payment_method" varchar(64) NOT NULL DEFAULT 'cash',
	"amount_due" numeric(14, 2) NOT NULL,
	"amount_paid" numeric(14, 2) NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"receipt_no" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "medication_order_batch_payment_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "medication_order_batch_payment_batch_id_medication_order_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."medication_order_batch"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "medication_order_batch_payment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "medication_order_batch_payment_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "medication_order_batch_payment_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS "medication_order_batch_payment_batch_id_uidx" ON "medication_order_batch_payment" ("batch_id") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "medication_order_batch_payment_hospital_receipt_uidx" ON "medication_order_batch_payment" ("hospital_id", "receipt_no") WHERE "deleted_at" IS NULL;
