CREATE TABLE "ot_billing" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"admission_id" integer,
	"bill_no" varchar(128),
	"lines_subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_type_id" integer DEFAULT 1 NOT NULL,
	"discount_percent" numeric(5, 2),
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"transferred_at" timestamp with time zone,
	"transferred_by" uuid,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"status_tagging_id" integer DEFAULT 56 NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ot_billing_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"ot_billing_id" integer NOT NULL,
	"surgical_case_id" integer,
	"service_id" integer,
	"service_name_snapshot" varchar(512),
	"service_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"service_tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"line_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ot_billing" ADD CONSTRAINT "ot_billing_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ot_billing" ADD CONSTRAINT "ot_billing_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ot_billing" ADD CONSTRAINT "ot_billing_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ot_billing" ADD CONSTRAINT "ot_billing_admission_id_ipd_admission_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."ipd_admission"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ot_billing" ADD CONSTRAINT "ot_billing_transferred_by_staff_id_fk" FOREIGN KEY ("transferred_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ot_billing" ADD CONSTRAINT "ot_billing_closed_by_staff_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ot_billing" ADD CONSTRAINT "ot_billing_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ot_billing" ADD CONSTRAINT "ot_billing_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ot_billing_line" ADD CONSTRAINT "ot_billing_line_ot_billing_id_ot_billing_id_fk" FOREIGN KEY ("ot_billing_id") REFERENCES "public"."ot_billing"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ot_billing_line" ADD CONSTRAINT "ot_billing_line_surgical_case_id_surgical_case_id_fk" FOREIGN KEY ("surgical_case_id") REFERENCES "public"."surgical_case"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ot_billing_line" ADD CONSTRAINT "ot_billing_line_service_id_service_item_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_item"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ot_billing_line" ADD CONSTRAINT "ot_billing_line_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ot_billing_visit_idx" ON "ot_billing" USING btree ("visit_id");
--> statement-breakpoint
CREATE INDEX "ot_billing_hospital_idx" ON "ot_billing" USING btree ("hospital_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "ot_billing_visit_uidx" ON "ot_billing" USING btree ("visit_id");
--> statement-breakpoint
CREATE INDEX "ot_billing_line_bill_idx" ON "ot_billing_line" USING btree ("ot_billing_id");
--> statement-breakpoint
CREATE INDEX "ot_billing_line_case_idx" ON "ot_billing_line" USING btree ("surgical_case_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "ot_billing_line_bill_case_uidx" ON "ot_billing_line" USING btree ("ot_billing_id", "surgical_case_id");
