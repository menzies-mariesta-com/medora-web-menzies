ALTER TABLE "store" ADD COLUMN IF NOT EXISTS "is_central_store" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "store_branch_central_unique" ON "store" ("branch_id") WHERE "is_central_store" = true;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_approval_level" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"store_id" integer NOT NULL,
	"module" varchar(8) NOT NULL,
	"level" integer NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "inv_approval_level_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_approval_level_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_approval_level_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_approval_level_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_approval_level_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_approval_level_module_chk" CHECK ("module" IN ('PR', 'PO')),
	CONSTRAINT "inv_approval_level_level_positive_chk" CHECK ("level" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inv_approval_level_store_module_level_uidx" ON "inv_approval_level" ("hospital_id","store_id","module","level");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_approval_level_hospital_store_idx" ON "inv_approval_level" ("hospital_id","store_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_approval_assignee" (
	"id" serial PRIMARY KEY NOT NULL,
	"level_id" integer NOT NULL,
	"staff_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inv_approval_assignee_level_id_inv_approval_level_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."inv_approval_level"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_approval_assignee_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inv_approval_assignee_level_staff_uidx" ON "inv_approval_assignee" ("level_id","staff_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_approval_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"module" varchar(8) NOT NULL,
	"level" integer NOT NULL,
	"action" integer NOT NULL,
	"remarks" text,
	"approved_by" text NOT NULL,
	"line_adjustments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inv_approval_log_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_approval_log_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_approval_log_module_chk" CHECK ("module" IN ('PR', 'PO'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_approval_log_document_idx" ON "inv_approval_log" ("document_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_requisition" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"store_id" integer NOT NULL,
	"requested_by" text NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "purchase_requisition_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "purchase_requisition_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "purchase_requisition_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "purchase_requisition_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "purchase_requisition_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "purchase_requisition_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "purchase_requisition_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_requisition_hospital_store_idx" ON "purchase_requisition" ("hospital_id","store_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_requisition_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"pr_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"unit_id" integer NOT NULL,
	"qty_remaining" numeric(18, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "purchase_requisition_line_pr_id_purchase_requisition_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisition"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "purchase_requisition_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "purchase_requisition_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "purchase_requisition_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "purchase_requisition_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "purchase_requisition_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_requisition_line_pr_id_idx" ON "purchase_requisition_line" ("pr_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_order" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"pr_id" uuid NOT NULL,
	"supplier_id" integer NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"sent_to_supplier_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "purchase_order_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "purchase_order_pr_id_purchase_requisition_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisition"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "purchase_order_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "purchase_order_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "purchase_order_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "purchase_order_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "purchase_order_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_order_hospital_pr_idx" ON "purchase_order" ("hospital_id","pr_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchase_order_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"po_id" uuid NOT NULL,
	"pr_line_id" integer,
	"item_id" integer NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"unit_id" integer NOT NULL,
	"unit_price" numeric(14, 4) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL,
	"manufacturer_id" integer,
	"qty_received_cumulative" numeric(18, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "purchase_order_line_po_id_purchase_order_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_order"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "purchase_order_line_pr_line_id_purchase_requisition_line_id_fk" FOREIGN KEY ("pr_line_id") REFERENCES "public"."purchase_requisition_line"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "purchase_order_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "purchase_order_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "purchase_order_line_manufacturer_id_manufacturer_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturer"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "purchase_order_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "purchase_order_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "purchase_order_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_order_line_po_id_idx" ON "purchase_order_line" ("po_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goods_receipt_note" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"po_id" uuid NOT NULL,
	"store_id" integer NOT NULL,
	"received_by" text NOT NULL,
	"received_date" date NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "goods_receipt_note_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "goods_receipt_note_po_id_purchase_order_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_order"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "goods_receipt_note_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "goods_receipt_note_received_by_user_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "goods_receipt_note_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "goods_receipt_note_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "goods_receipt_note_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "goods_receipt_note_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goods_receipt_note_po_id_idx" ON "goods_receipt_note" ("po_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goods_receipt_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"grn_id" uuid NOT NULL,
	"po_line_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"received_qty" numeric(18, 6) NOT NULL,
	"batch_no" varchar(128),
	"expiry_date" date,
	"unit_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "goods_receipt_line_grn_id_goods_receipt_note_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."goods_receipt_note"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "goods_receipt_line_po_line_id_purchase_order_line_id_fk" FOREIGN KEY ("po_line_id") REFERENCES "public"."purchase_order_line"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "goods_receipt_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "goods_receipt_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "goods_receipt_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "goods_receipt_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "goods_receipt_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goods_receipt_line_grn_id_idx" ON "goods_receipt_line" ("grn_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_stock_lot" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"store_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"batch_no" varchar(128),
	"expiry_date" date,
	"quantity" numeric(18, 6) NOT NULL,
	"grn_line_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "inv_stock_lot_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_stock_lot_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_stock_lot_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_stock_lot_grn_line_id_goods_receipt_line_id_fk" FOREIGN KEY ("grn_line_id") REFERENCES "public"."goods_receipt_line"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "inv_stock_lot_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_stock_lot_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_stock_lot_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_stock_lot_store_item_idx" ON "inv_stock_lot" ("store_id","item_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inv_stock_lot_grn_line_uidx" ON "inv_stock_lot" ("grn_line_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_store_transfer" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"from_store_id" integer NOT NULL,
	"to_store_id" integer NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"requested_by" text NOT NULL,
	"approved_by" text,
	"posted_at" timestamp with time zone,
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "inv_store_transfer_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_store_transfer_from_store_id_store_id_fk" FOREIGN KEY ("from_store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_store_transfer_to_store_id_store_id_fk" FOREIGN KEY ("to_store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_store_transfer_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_store_transfer_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_store_transfer_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "inv_store_transfer_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_store_transfer_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_store_transfer_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_store_transfer_stores_distinct_chk" CHECK ("from_store_id" <> "to_store_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_store_transfer_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"transfer_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"unit_id" integer NOT NULL,
	"stock_lot_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "inv_store_transfer_line_transfer_id_inv_store_transfer_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."inv_store_transfer"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_store_transfer_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_store_transfer_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_store_transfer_line_stock_lot_id_inv_stock_lot_id_fk" FOREIGN KEY ("stock_lot_id") REFERENCES "public"."inv_stock_lot"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "inv_store_transfer_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_store_transfer_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_store_transfer_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_store_transfer_line_transfer_id_idx" ON "inv_store_transfer_line" ("transfer_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_stock_issue" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"store_id" integer NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"issued_to" text,
	"reason" text,
	"posted_at" timestamp with time zone,
	"requested_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "inv_stock_issue_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_stock_issue_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_stock_issue_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_stock_issue_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_stock_issue_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_stock_issue_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_stock_issue_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_stock_issue_store_idx" ON "inv_stock_issue" ("store_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inv_stock_issue_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"qty" numeric(18, 6) NOT NULL,
	"unit_id" integer NOT NULL,
	"stock_lot_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "inv_stock_issue_line_issue_id_inv_stock_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."inv_stock_issue"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "inv_stock_issue_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_stock_issue_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "inv_stock_issue_line_stock_lot_id_inv_stock_lot_id_fk" FOREIGN KEY ("stock_lot_id") REFERENCES "public"."inv_stock_lot"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "inv_stock_issue_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_stock_issue_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "inv_stock_issue_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inv_stock_issue_line_issue_id_idx" ON "inv_stock_issue_line" ("issue_id");
