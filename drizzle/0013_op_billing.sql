CREATE TABLE IF NOT EXISTS "op_billing" (
	"id" serial PRIMARY KEY NOT NULL,
	"visit_id" integer NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"bill_no" varchar(128),
	"lines_subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_type_id" integer DEFAULT 1 NOT NULL,
	"discount_percent" numeric(5, 2),
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"remark" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "op_billing_visit_id_idx" ON "op_billing" USING btree ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "op_billing_hospital_id_idx" ON "op_billing" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "op_billing_branch_id_idx" ON "op_billing" USING btree ("branch_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "op_billing_bill_no_idx" ON "op_billing" USING btree ("bill_no");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "op_billing_status_id_idx" ON "op_billing" USING btree ("status_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "op_billing_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"op_billing_id" integer NOT NULL,
	"line_index" integer NOT NULL,
	"service_order_detail_id" integer,
	"service_id" integer NOT NULL,
	"service_name_snapshot" varchar(512),
	"sub_category_id" integer,
	"sub_category_name_snapshot" varchar(512),
	"order_no_snapshot" varchar(128),
	"discount" numeric(14, 2),
	"service_amount" numeric(14, 2),
	"service_tax_amount" numeric(14, 2),
	"service_unit" integer,
	"line_total" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "op_billing_line" ADD CONSTRAINT "op_billing_line_op_billing_id_op_billing_id_fk" FOREIGN KEY ("op_billing_id") REFERENCES "public"."op_billing"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "op_billing_line" ADD CONSTRAINT "op_billing_line_service_order_detail_id_service_order_detail_id_fk" FOREIGN KEY ("service_order_detail_id") REFERENCES "public"."service_order_detail"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "op_billing_line" ADD CONSTRAINT "op_billing_line_service_id_service_item_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_item"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "op_billing_line" ADD CONSTRAINT "op_billing_line_sub_category_id_sub_category_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."sub_category"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "op_billing_line_op_billing_id_idx" ON "op_billing_line" USING btree ("op_billing_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "op_billing_line_service_id_idx" ON "op_billing_line" USING btree ("service_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "op_billing_line_service_order_detail_id_idx" ON "op_billing_line" USING btree ("service_order_detail_id");
