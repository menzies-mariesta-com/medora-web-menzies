-- Clinical platform features 63-75: order sets, CDS, formulary, eMAR, care plans, alerts, ROI, immunization, registry

ALTER TABLE "item_master" ADD COLUMN IF NOT EXISTS "fdb_drug_id" varchar(64);
--> statement-breakpoint
ALTER TABLE "progress_note" ADD COLUMN IF NOT EXISTS "signed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "progress_note" ADD COLUMN IF NOT EXISTS "signed_by" uuid REFERENCES "staff"("id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical_order_set" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"name" varchar(512) NOT NULL,
	"specialty_tag" varchar(128),
	"version" integer DEFAULT 1 NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_order_set_hospital_idx" ON "clinical_order_set" ("hospital_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical_order_set_trigger" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_set_id" integer NOT NULL REFERENCES "clinical_order_set"("id") ON DELETE CASCADE,
	"trigger_type" varchar(32) NOT NULL,
	"trigger_ref_id" integer,
	"trigger_ref_code" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical_order_set_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_set_id" integer NOT NULL REFERENCES "clinical_order_set"("id") ON DELETE CASCADE,
	"line_no" integer DEFAULT 1 NOT NULL,
	"line_type" varchar(32) NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prescribing_alert" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"visit_id" uuid REFERENCES "patient_visit"("id") ON DELETE SET NULL,
	"batch_id" integer REFERENCES "medication_order_batch"("id") ON DELETE SET NULL,
	"alert_type" varchar(64) NOT NULL,
	"severity" varchar(16) NOT NULL,
	"message" text NOT NULL,
	"fdb_concept_id" varchar(64),
	"overridden" boolean DEFAULT false NOT NULL,
	"override_reason_code" varchar(64),
	"override_remark" text,
	"overridden_by" uuid REFERENCES "staff"("id") ON DELETE SET NULL,
	"overridden_at" timestamp with time zone,
	"created_by" uuid REFERENCES "staff"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospital_formulary_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"item_master_id" integer NOT NULL REFERENCES "item_master"("id") ON DELETE CASCADE,
	"tier" varchar(32) NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hospital_formulary_item_hospital_item_uidx"
	ON "hospital_formulary_item" ("hospital_id", "item_master_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "formulary_substitution_rule" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"restricted_item_master_id" integer NOT NULL REFERENCES "item_master"("id") ON DELETE CASCADE,
	"preferred_item_master_id" integer NOT NULL REFERENCES "item_master"("id") ON DELETE CASCADE,
	"conditions_json" jsonb DEFAULT '{}'::jsonb,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pharmacy_product_identifier" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"item_master_id" integer NOT NULL REFERENCES "item_master"("id") ON DELETE CASCADE,
	"barcode_value" varchar(128) NOT NULL,
	"identifier_type" varchar(16) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pharmacy_product_id_hospital_barcode_uidx"
	ON "pharmacy_product_identifier" ("hospital_id", "barcode_value");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medication_order_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"visit_id" uuid NOT NULL REFERENCES "patient_visit"("id") ON DELETE CASCADE,
	"line_id" integer NOT NULL REFERENCES "medication_order_line"("id") ON DELETE CASCADE,
	"scheduled_at" timestamp with time zone NOT NULL,
	"dose_label" varchar(256),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medication_administration" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"visit_id" uuid NOT NULL REFERENCES "patient_visit"("id") ON DELETE CASCADE,
	"schedule_id" integer REFERENCES "medication_order_schedule"("id") ON DELETE SET NULL,
	"line_id" integer NOT NULL REFERENCES "medication_order_line"("id") ON DELETE RESTRICT,
	"administration_status" varchar(32) NOT NULL,
	"administered_at" timestamp with time zone NOT NULL,
	"scanned_patient_token" varchar(256),
	"scanned_product_barcode" varchar(128),
	"scanned_nurse_code" varchar(128),
	"nurse_staff_id" uuid REFERENCES "staff"("id") ON DELETE SET NULL,
	"late_reason" text,
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medication_order_infusion" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" integer NOT NULL REFERENCES "medication_order_line"("id") ON DELETE CASCADE,
	"infusion_type" varchar(32) NOT NULL,
	"total_volume_ml" numeric(18, 6),
	"rate_ml_hr" numeric(18, 6),
	"rate_weight_based_json" jsonb,
	"diluent_item_master_id" integer REFERENCES "item_master"("id") ON DELETE SET NULL,
	"concentration" varchar(128),
	"pump_id" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_infusion_line_uidx" ON "medication_order_infusion" ("line_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nursing_care_plan_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"title" varchar(512) NOT NULL,
	"nanda_label" varchar(256),
	"sections_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nursing_care_plan_instance" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"branch_id" uuid NOT NULL REFERENCES "hospital_branch"("id"),
	"patient_id" uuid NOT NULL REFERENCES "patient"("id"),
	"visit_id" uuid NOT NULL REFERENCES "patient_visit"("id"),
	"template_id" integer REFERENCES "nursing_care_plan_template"("id") ON DELETE SET NULL,
	"content_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"signed_at" timestamp with time zone,
	"signed_by" uuid REFERENCES "staff"("id") ON DELETE SET NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical_alert" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patient"("id"),
	"visit_id" uuid REFERENCES "patient_visit"("id") ON DELETE SET NULL,
	"rule_code" varchar(64) NOT NULL,
	"severity" varchar(16) NOT NULL,
	"title" varchar(512) NOT NULL,
	"message" text NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb,
	"alert_status" varchar(32) DEFAULT 'open' NOT NULL,
	"assigned_staff_id" uuid REFERENCES "staff"("id") ON DELETE SET NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" uuid REFERENCES "staff"("id") ON DELETE SET NULL,
	"snoozed_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "progress_note_addendum_reason" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"code" varchar(64) NOT NULL,
	"label" varchar(256) NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "progress_note_addendum" (
	"id" serial PRIMARY KEY NOT NULL,
	"progress_note_id" integer NOT NULL REFERENCES "progress_note"("id") ON DELETE CASCADE,
	"reason_code" varchar(64) NOT NULL,
	"body" text NOT NULL,
	"author_staff_id" uuid REFERENCES "staff"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roi_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patient"("id"),
	"requester_name" varchar(512) NOT NULL,
	"requester_contact" varchar(256),
	"scope_description" text NOT NULL,
	"request_status" varchar(32) NOT NULL,
	"due_date" date,
	"assigned_staff_id" uuid REFERENCES "staff"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roi_request_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"roi_request_id" integer NOT NULL REFERENCES "roi_request"("id") ON DELETE CASCADE,
	"event_type" varchar(64) NOT NULL,
	"remark" text,
	"staff_id" uuid REFERENCES "staff"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "immunization_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"cvx_code" varchar(16) NOT NULL,
	"name" varchar(512) NOT NULL,
	"schedule_rules_json" jsonb DEFAULT '[]'::jsonb,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "immunization_master_cvx_uidx" ON "immunization_master" ("cvx_code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_immunization" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patient"("id"),
	"visit_id" uuid REFERENCES "patient_visit"("id") ON DELETE SET NULL,
	"immunization_master_id" integer NOT NULL REFERENCES "immunization_master"("id") ON DELETE RESTRICT,
	"administered_on" date NOT NULL,
	"dose_sequence" integer DEFAULT 1 NOT NULL,
	"lot_number" varchar(128),
	"site" varchar(128),
	"administrator_staff_id" uuid REFERENCES "staff"("id") ON DELETE SET NULL,
	"vis_given" boolean DEFAULT false NOT NULL,
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registry_definition" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"code" varchar(64) NOT NULL,
	"name" varchar(512) NOT NULL,
	"inclusion_rules_json" jsonb DEFAULT '{}'::jsonb,
	"recall_interval_days" integer DEFAULT 90,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "registry_definition_hospital_code_uidx"
	ON "registry_definition" ("hospital_id", "code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registry_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"registry_definition_id" integer NOT NULL REFERENCES "registry_definition"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patient"("id"),
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_review_at" timestamp with time zone,
	"next_recall_date" date,
	"member_status" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "registry_member_registry_patient_uidx"
	ON "registry_member" ("registry_definition_id", "patient_id");
