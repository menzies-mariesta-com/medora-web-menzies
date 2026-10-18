-- Perioperative suite: clinical forms, surgical cases, ED, implants (features 53-62)

CREATE TABLE IF NOT EXISTS "clinical_form_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid,
	"code" varchar(128) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"title" varchar(512) NOT NULL,
	"schema_json" jsonb NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "clinical_form_template_code_hospital_uidx"
	ON "clinical_form_template" ("code", COALESCE("hospital_id", '00000000-0000-0000-0000-000000000000'::uuid));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical_form_instance" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"surgical_case_id" integer,
	"template_id" integer NOT NULL,
	"context_type" varchar(64) NOT NULL,
	"values_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status_tagging_id" integer,
	"signed_at" timestamp with time zone,
	"signed_by" uuid,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_form_instance_visit_idx" ON "clinical_form_instance" ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinical_form_instance_case_idx" ON "clinical_form_instance" ("surgical_case_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ot_room" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"sequence_no" integer DEFAULT 0 NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ot_room_hospital_branch_idx" ON "ot_room" ("hospital_id", "branch_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "surgical_case" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"admission_id" integer,
	"service_order_detail_id" integer,
	"ot_room_id" integer,
	"procedure_name" varchar(512) NOT NULL DEFAULT '',
	"case_type" varchar(32) NOT NULL DEFAULT 'general',
	"priority" varchar(32) NOT NULL DEFAULT 'elective',
	"status_tagging_id" integer NOT NULL,
	"scheduled_start" timestamp with time zone,
	"scheduled_end" timestamp with time zone,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"pre_op_complete_at" timestamp with time zone,
	"displaced_by_case_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "surgical_case_hospital_idx" ON "surgical_case" ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "surgical_case_visit_idx" ON "surgical_case" ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "surgical_case_room_schedule_idx" ON "surgical_case" ("ot_room_id", "scheduled_start");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "surgical_case_staff" (
	"surgical_case_id" integer NOT NULL,
	"staff_id" uuid NOT NULL,
	"role_code" varchar(32) NOT NULL,
	PRIMARY KEY ("surgical_case_id", "staff_id", "role_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "surgical_case_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"surgical_case_id" integer NOT NULL,
	"action" varchar(64) NOT NULL,
	"detail_json" jsonb,
	"staff_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "surgical_case_audit_case_idx" ON "surgical_case_audit" ("surgical_case_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ed_encounter" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"board_column" varchar(64) NOT NULL DEFAULT 'waiting_triage',
	"fast_track" boolean DEFAULT false NOT NULL,
	"triage_system" varchar(16),
	"triage_form_instance_id" integer,
	"acuity_level" varchar(32),
	"assigned_doctor_id" uuid,
	"arrived_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ed_encounter_visit_uidx" ON "ed_encounter" ("visit_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trauma_activation" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"level_code" varchar(16) NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deactivated_at" timestamp with time zone,
	"form_instance_id" integer,
	"activated_by" uuid,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trauma_activation_hospital_idx" ON "trauma_activation" ("hospital_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "surgical_case_implant" (
	"id" serial PRIMARY KEY NOT NULL,
	"surgical_case_id" integer NOT NULL,
	"hospital_id" uuid NOT NULL,
	"item_batch_id" integer,
	"udi_raw" varchar(512),
	"quantity" decimal(14, 4) DEFAULT '1' NOT NULL,
	"department_consumption_id" uuid,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "surgical_case_implant_case_idx" ON "surgical_case_implant" ("surgical_case_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospital_perioperative_setting" (
	"hospital_id" uuid PRIMARY KEY NOT NULL,
	"default_ed_triage_system" varchar(16) DEFAULT 'esi' NOT NULL,
	"pre_op_mandatory" boolean DEFAULT true NOT NULL,
	"who_block_without_timeout" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_batch" ADD COLUMN IF NOT EXISTS "udi_di" varchar(128);
--> statement-breakpoint
ALTER TABLE "item_batch" ADD COLUMN IF NOT EXISTS "serial_no" varchar(128);
--> statement-breakpoint
ALTER TABLE "operative_note" ADD COLUMN IF NOT EXISTS "surgical_case_id" integer;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ld_encounter" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"board_column" varchar(64) DEFAULT 'active_labor' NOT NULL,
	"partogram_form_instance_id" integer,
	"delivery_form_instance_id" integer,
	"surgical_case_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ld_encounter_visit_uidx" ON "ld_encounter" ("visit_id");
