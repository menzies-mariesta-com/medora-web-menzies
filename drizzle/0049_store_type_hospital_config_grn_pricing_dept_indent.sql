-- Store type master, hospital central purchasing config, GRN line pricing, department indent, approval module 'DI'

-- 1) store_type
CREATE TABLE IF NOT EXISTS "store_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL UNIQUE,
	"name" varchar(256) NOT NULL,
	"status_id" integer NOT NULL DEFAULT 1 REFERENCES "status"("id") ON DELETE restrict,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO "store_type" ("id", "code", "name", "status_id")
VALUES
	(1, 'REGULAR', 'Regular', 1),
	(2, 'CENTRAL', 'Central', 1),
	(3, 'CENTRAL_PURCHASING', 'Central purchasing', 1)
ON CONFLICT ("id") DO NOTHING;

-- 2) store: type + purchase requisitable
ALTER TABLE "store" ADD COLUMN IF NOT EXISTS "store_type_id" integer DEFAULT 1 NOT NULL REFERENCES "store_type"("id") ON DELETE restrict;
ALTER TABLE "store" ADD COLUMN IF NOT EXISTS "is_purchase_requisitable" boolean DEFAULT false NOT NULL;

-- 3) hospital inventory config (nullable CPS until user configures)
CREATE TABLE IF NOT EXISTS "hospital_inventory_config" (
	"hospital_id" uuid PRIMARY KEY NOT NULL REFERENCES "hospital"("id") ON DELETE cascade,
	"central_purchasing_store_id" integer REFERENCES "store"("id") ON DELETE restrict,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4) item_batch: sale metrics (issue unit; set at GRN post)
ALTER TABLE "item_batch" ADD COLUMN IF NOT EXISTS "sale_price" numeric(14, 4);
ALTER TABLE "item_batch" ADD COLUMN IF NOT EXISTS "emp_sale_price" numeric(14, 4);

-- 5) goods_receipt_line: pricing
ALTER TABLE "goods_receipt_line" ADD COLUMN IF NOT EXISTS "free_qty" numeric(18, 6) DEFAULT '0' NOT NULL;
ALTER TABLE "goods_receipt_line" ADD COLUMN IF NOT EXISTS "discount_amount" numeric(14, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "goods_receipt_line" ADD COLUMN IF NOT EXISTS "discount_percent" numeric(8, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "goods_receipt_line" ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "goods_receipt_line" ADD COLUMN IF NOT EXISTS "tax_percent" numeric(8, 4) DEFAULT '0' NOT NULL;
ALTER TABLE "goods_receipt_line" ADD COLUMN IF NOT EXISTS "sale_price" numeric(14, 4);
ALTER TABLE "goods_receipt_line" ADD COLUMN IF NOT EXISTS "emp_sale_price" numeric(14, 4);

-- 6) inv_store_transfer: optional link to GRN for PR fulfillment transfers
ALTER TABLE "inv_store_transfer" ADD COLUMN IF NOT EXISTS "source_grn_id" uuid REFERENCES "goods_receipt_note"("id") ON DELETE set null;

-- 7) Approval module: add DI
ALTER TABLE "inv_approval_level" DROP CONSTRAINT IF EXISTS "inv_approval_level_module_chk";
ALTER TABLE "inv_approval_level" ADD CONSTRAINT "inv_approval_level_module_chk" CHECK ("module" IN ('PR', 'PO', 'DI'));
ALTER TABLE "inv_approval_log" DROP CONSTRAINT IF EXISTS "inv_approval_log_module_chk";
ALTER TABLE "inv_approval_log" ADD CONSTRAINT "inv_approval_log_module_chk" CHECK ("module" IN ('PR', 'PO', 'DI'));

-- 8) status: Department indent (type 8) — ids 40–45
INSERT INTO "status_tagging_type" ("id", "name")
VALUES (8, 'Department indent')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "status_tagging" ("id", "name", "code", "sequence_no", "status_tagging_type_id")
VALUES
	(40, 'Draft', 'draft', 1, 8),
	(41, 'Pending', 'pending', 2, 8),
	(42, 'Pending central', 'pending_central', 3, 8),
	(43, 'Issued', 'issued', 4, 8),
	(44, 'Received', 'received', 5, 8),
	(45, 'Cancelled', 'cancelled', 6, 8)
ON CONFLICT ("id") DO NOTHING;

-- 9) inv_department_indent
CREATE TABLE IF NOT EXISTS "inv_department_indent" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE cascade,
	"indent_no" varchar(128),
	"from_store_id" integer NOT NULL REFERENCES "store"("id") ON DELETE restrict,
	"to_store_id" integer NOT NULL REFERENCES "store"("id") ON DELETE restrict,
	"requested_by" text NOT NULL REFERENCES "user"("id") ON DELETE restrict,
	"status_tagging_id" integer NOT NULL REFERENCES "status_tagging"("id") ON DELETE restrict,
	"current_level" integer NOT NULL DEFAULT 1,
	"remarks" text,
	"from_approved_by" text REFERENCES "user"("id") ON DELETE set null,
	"from_approved_at" timestamp with time zone,
	"issued_by" text REFERENCES "user"("id") ON DELETE set null,
	"issued_at" timestamp with time zone,
	"received_by" text REFERENCES "user"("id") ON DELETE set null,
	"received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text REFERENCES "user"("id") ON DELETE set null,
	"updated_by" text REFERENCES "user"("id") ON DELETE set null,
	"deleted_by" text REFERENCES "user"("id") ON DELETE set null,
	CONSTRAINT "inv_department_indent_from_to_distinct_chk" CHECK ("from_store_id" <> "to_store_id")
);

CREATE INDEX IF NOT EXISTS "inv_department_indent_hospital_from_idx" ON "inv_department_indent" ("hospital_id", "from_store_id");
CREATE INDEX IF NOT EXISTS "inv_department_indent_hospital_to_idx" ON "inv_department_indent" ("hospital_id", "to_store_id");
CREATE INDEX IF NOT EXISTS "inv_department_indent_status_idx" ON "inv_department_indent" ("status_tagging_id");

CREATE TABLE IF NOT EXISTS "inv_department_indent_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"indent_id" uuid NOT NULL REFERENCES "inv_department_indent"("id") ON DELETE cascade,
	"item_id" integer NOT NULL REFERENCES "item_master"("id") ON DELETE restrict,
	"quantity" numeric(18, 6) NOT NULL,
	"unit_id" integer NOT NULL REFERENCES "unit"("id") ON DELETE restrict,
	"qty_issued" numeric(18, 6) DEFAULT '0' NOT NULL,
	"batch_id" integer REFERENCES "item_batch"("id") ON DELETE set null,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);

CREATE INDEX IF NOT EXISTS "inv_department_indent_line_indent_id_idx" ON "inv_department_indent_line" ("indent_id");

-- Optional: multi-batch FEFO allocations for one indent line
CREATE TABLE IF NOT EXISTS "inv_department_indent_line_alloc" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" integer NOT NULL REFERENCES "inv_department_indent_line"("id") ON DELETE cascade,
	"batch_id" integer NOT NULL REFERENCES "item_batch"("id") ON DELETE restrict,
	"quantity" numeric(18, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "inv_department_indent_line_alloc_line_idx" ON "inv_department_indent_line_alloc" ("line_id");
