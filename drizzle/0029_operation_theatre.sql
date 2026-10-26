-- Operation Theatre module: theatre setup, booking fields, handoff tracking, blood requisition.

ALTER TABLE "ot_room" ADD COLUMN IF NOT EXISTS "freeze_minutes" integer DEFAULT 0 NOT NULL;
ALTER TABLE "ot_room" ADD COLUMN IF NOT EXISTS "ot_advance_mandatory" boolean DEFAULT false NOT NULL;

ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "booking_no" varchar(64);
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "ot_request_date" date;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "surgeon_id" uuid;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "paediatrician_id" uuid;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "provider_id" uuid;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "service_id" integer;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "provisional_diagnosis" text;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "duration_minutes" integer;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "ot_requested_by" uuid;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "clinical_notes" text;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "ward_remarks" text;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "tagged_at" timestamp with time zone;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "tagged_by" uuid;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "ward_to_ot_at" timestamp with time zone;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "ward_to_ot_by" uuid;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "pre_op_acknowledged_at" timestamp with time zone;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "pre_op_acknowledged_by" uuid;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "in_ot_at" timestamp with time zone;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "in_ot_by" uuid;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "post_op_at" timestamp with time zone;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "post_op_by" uuid;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "returned_to_ward_at" timestamp with time zone;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "returned_to_ward_by" uuid;
ALTER TABLE "surgical_case" ADD COLUMN IF NOT EXISTS "abort_reason" text;

DO $$ BEGIN
 ALTER TABLE "surgical_case" ADD CONSTRAINT "surgical_case_surgeon_id_staff_id_fk" FOREIGN KEY ("surgeon_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "surgical_case" ADD CONSTRAINT "surgical_case_paediatrician_id_staff_id_fk" FOREIGN KEY ("paediatrician_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "surgical_case" ADD CONSTRAINT "surgical_case_provider_id_staff_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "surgical_case" ADD CONSTRAINT "surgical_case_service_id_service_item_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_item"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "surgical_case" ADD CONSTRAINT "surgical_case_ot_requested_by_staff_id_fk" FOREIGN KEY ("ot_requested_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "surgical_case" ADD CONSTRAINT "surgical_case_tagged_by_staff_id_fk" FOREIGN KEY ("tagged_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "surgical_case" ADD CONSTRAINT "surgical_case_ward_to_ot_by_staff_id_fk" FOREIGN KEY ("ward_to_ot_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "surgical_case" ADD CONSTRAINT "surgical_case_pre_op_acknowledged_by_staff_id_fk" FOREIGN KEY ("pre_op_acknowledged_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "surgical_case" ADD CONSTRAINT "surgical_case_in_ot_by_staff_id_fk" FOREIGN KEY ("in_ot_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "surgical_case" ADD CONSTRAINT "surgical_case_post_op_by_staff_id_fk" FOREIGN KEY ("post_op_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "surgical_case" ADD CONSTRAINT "surgical_case_returned_to_ward_by_staff_id_fk" FOREIGN KEY ("returned_to_ward_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "surgical_case_booking_no_idx" ON "surgical_case" ("booking_no");
CREATE INDEX IF NOT EXISTS "surgical_case_request_date_idx" ON "surgical_case" ("ot_request_date");
CREATE INDEX IF NOT EXISTS "surgical_case_surgeon_idx" ON "surgical_case" ("surgeon_id");

CREATE TABLE IF NOT EXISTS "ot_blood_requisition" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"surgical_case_id" integer NOT NULL,
	"blood_group" varchar(16),
	"component" varchar(64) NOT NULL,
	"units" integer DEFAULT 1 NOT NULL,
	"urgency" varchar(32) DEFAULT 'routine' NOT NULL,
	"notes" text,
	"requested_by" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status_tagging_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ot_blood_requisition" ADD CONSTRAINT "ot_blood_requisition_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "ot_blood_requisition" ADD CONSTRAINT "ot_blood_requisition_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "ot_blood_requisition" ADD CONSTRAINT "ot_blood_requisition_surgical_case_id_surgical_case_id_fk" FOREIGN KEY ("surgical_case_id") REFERENCES "public"."surgical_case"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "ot_blood_requisition" ADD CONSTRAINT "ot_blood_requisition_requested_by_staff_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "ot_blood_requisition" ADD CONSTRAINT "ot_blood_requisition_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "ot_blood_requisition" ADD CONSTRAINT "ot_blood_requisition_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "ot_blood_requisition_case_idx" ON "ot_blood_requisition" ("surgical_case_id");
CREATE INDEX IF NOT EXISTS "ot_blood_requisition_hospital_idx" ON "ot_blood_requisition" ("hospital_id");
