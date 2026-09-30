-- IPD admission order (pending worklist), advance deposits, IP bill credit columns
--> statement-breakpoint
INSERT INTO status_tagging_type (id, name)
VALUES (14, 'IPD Admission Order')
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
INSERT INTO status_tagging (id, name, code, sequence_no, status_tagging_type_id)
VALUES
	(68, 'Pending', 'pending', 1, 14),
	(69, 'Cancelled', 'cancelled', 2, 14),
	(70, 'Admitted', 'admitted', 3, 14)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ipd_admission_order" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"source_opd_visit_id" integer NOT NULL,
	"patient_id" uuid NOT NULL,
	"ordering_doctor_id" uuid,
	"care_level" integer DEFAULT 1 NOT NULL,
	"urgency" integer DEFAULT 1 NOT NULL,
	"preferred_ward_id" integer,
	"notes" text,
	"admission_id" integer,
	"status_tagging_id" integer DEFAULT 68 NOT NULL,
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
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_hospital_id_hospital_id_fk"
		FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_branch_id_hospital_branch_id_fk"
		FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_source_opd_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("source_opd_visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_patient_id_patient_id_fk"
		FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_ordering_doctor_id_staff_id_fk"
		FOREIGN KEY ("ordering_doctor_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_preferred_ward_id_ward_id_fk"
		FOREIGN KEY ("preferred_ward_id") REFERENCES "public"."ward"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_admission_id_ipd_admission_id_fk"
		FOREIGN KEY ("admission_id") REFERENCES "public"."ipd_admission"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_status_tagging_id_status_tagging_id_fk"
		FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_status_id_status_id_fk"
		FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_created_by_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_updated_by_user_id_fk"
		FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission_order" ADD CONSTRAINT "ipd_admission_order_deleted_by_user_id_fk"
		FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ipd_admission_order_hospital_id_idx" ON "ipd_admission_order" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ipd_admission_order_patient_id_idx" ON "ipd_admission_order" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ipd_admission_order_source_opd_visit_id_idx" ON "ipd_admission_order" USING btree ("source_opd_visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ipd_admission_order_status_tagging_id_idx" ON "ipd_admission_order" USING btree ("status_tagging_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ipd_admission_order_pending_source_opd_uidx"
	ON "ipd_admission_order" USING btree ("source_opd_visit_id")
	WHERE "status_tagging_id" = 68;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ip_advance_deposit" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"admission_id" integer NOT NULL,
	"visit_id" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"payment_method" varchar(64) DEFAULT 'cash' NOT NULL,
	"receipt_no" varchar(128),
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_by_staff_id" uuid,
	"notes" text,
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
	ALTER TABLE "ip_advance_deposit" ADD CONSTRAINT "ip_advance_deposit_hospital_id_hospital_id_fk"
		FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_advance_deposit" ADD CONSTRAINT "ip_advance_deposit_admission_id_ipd_admission_id_fk"
		FOREIGN KEY ("admission_id") REFERENCES "public"."ipd_admission"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_advance_deposit" ADD CONSTRAINT "ip_advance_deposit_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_advance_deposit" ADD CONSTRAINT "ip_advance_deposit_paid_by_staff_id_staff_id_fk"
		FOREIGN KEY ("paid_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_advance_deposit" ADD CONSTRAINT "ip_advance_deposit_status_id_status_id_fk"
		FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_advance_deposit" ADD CONSTRAINT "ip_advance_deposit_created_by_user_id_fk"
		FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_advance_deposit" ADD CONSTRAINT "ip_advance_deposit_updated_by_user_id_fk"
		FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ip_advance_deposit" ADD CONSTRAINT "ip_advance_deposit_deleted_by_user_id_fk"
		FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ip_advance_deposit_hospital_id_idx" ON "ip_advance_deposit" USING btree ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ip_advance_deposit_admission_id_idx" ON "ip_advance_deposit" USING btree ("admission_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ip_advance_deposit_visit_id_idx" ON "ip_advance_deposit" USING btree ("visit_id");
--> statement-breakpoint
ALTER TABLE "ip_billing" ADD COLUMN IF NOT EXISTS "advance_applied_amount" numeric(14, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "ip_billing" ADD COLUMN IF NOT EXISTS "amount_paid" numeric(14, 2) DEFAULT '0' NOT NULL;
