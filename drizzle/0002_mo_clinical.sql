-- Phase 1–7 MO clinical schema
ALTER TABLE "progress_note" ADD COLUMN IF NOT EXISTS "subjective" text;
--> statement-breakpoint
ALTER TABLE "progress_note" ADD COLUMN IF NOT EXISTS "objective" text;
--> statement-breakpoint
ALTER TABLE "progress_note" ADD COLUMN IF NOT EXISTS "assessment" text;
--> statement-breakpoint
ALTER TABLE "progress_note" ADD COLUMN IF NOT EXISTS "plan" text;
--> statement-breakpoint
ALTER TABLE "progress_note" ADD COLUMN IF NOT EXISTS "cosigned_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "progress_note" ADD COLUMN IF NOT EXISTS "cosigned_by" uuid;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "diagnosis_code" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(32) NOT NULL,
	"system" varchar(32) DEFAULT 'ICD10' NOT NULL,
	"description" text NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "diagnosis_code_system_code_uidx" ON "diagnosis_code" ("system","code");
--> statement-breakpoint
ALTER TABLE "diagnosis" ADD COLUMN IF NOT EXISTS "diagnosis_code_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "diagnosis" ADD CONSTRAINT "diagnosis_diagnosis_code_id_diagnosis_code_id_fk" FOREIGN KEY ("diagnosis_code_id") REFERENCES "public"."diagnosis_code"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "discharge_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"visit_id" integer NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"hospital_course" text DEFAULT '' NOT NULL,
	"discharge_medications" text DEFAULT '' NOT NULL,
	"follow_up" text DEFAULT '' NOT NULL,
	"red_flags" text DEFAULT '' NOT NULL,
	"drafted_by" uuid,
	"signed_by" uuid,
	"signed_at" timestamp with time zone,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "discharge_summary_visit_uidx" ON "discharge_summary" ("visit_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_result" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"visit_id" integer NOT NULL,
	"service_order_detail_id" integer,
	"result_text" text DEFAULT '' NOT NULL,
	"result_json" text,
	"is_critical" boolean DEFAULT false NOT NULL,
	"entered_by" uuid,
	"endorsed_at" timestamp with time zone,
	"endorsed_by" uuid,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "imaging_result" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"visit_id" integer NOT NULL,
	"service_order_detail_id" integer,
	"findings" text DEFAULT '' NOT NULL,
	"attachment_url" text,
	"entered_by" uuid,
	"endorsed_at" timestamp with time zone,
	"endorsed_by" uuid,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinical_procedure" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"visit_id" integer NOT NULL,
	"patient_id" uuid NOT NULL,
	"procedure_type" varchar(256) NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"performed_at" timestamp with time zone,
	"doctor_id" uuid,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "operative_note" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"visit_id" integer NOT NULL,
	"patient_id" uuid NOT NULL,
	"pre_op" text DEFAULT '' NOT NULL,
	"findings" text DEFAULT '' NOT NULL,
	"technique" text DEFAULT '' NOT NULL,
	"blood_loss" varchar(128),
	"specimens" text DEFAULT '' NOT NULL,
	"post_op" text DEFAULT '' NOT NULL,
	"surgeon_id" uuid,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "item_master" ADD COLUMN IF NOT EXISTS "is_high_risk" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "discharge_summary" ADD COLUMN IF NOT EXISTS "cosigned_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "discharge_summary" ADD COLUMN IF NOT EXISTS "cosigned_by" uuid;
--> statement-breakpoint
INSERT INTO form_name (id, code, name, form_type, status_id)
VALUES
	(5, 'hpi', 'History of present illness', 'observation_emr_visit', 1),
	(6, 'physical_exam', 'Physical examination', 'observation_emr_visit', 1),
	(7, 'specialty_obstetrics', 'Obstetrics case sheet', 'specialty_case_sheet', 1),
	(8, 'specialty_pediatrics', 'Pediatrics case sheet', 'specialty_case_sheet', 1),
	(9, 'specialty_surgery', 'Surgery case sheet', 'specialty_case_sheet', 1),
	(10, 'specialty_emergency', 'Emergency case sheet', 'specialty_case_sheet', 1)
ON CONFLICT (id) DO UPDATE SET
	code = EXCLUDED.code,
	name = EXCLUDED.name,
	form_type = EXCLUDED.form_type,
	status_id = EXCLUDED.status_id;
--> statement-breakpoint
INSERT INTO staff_type (id, name, code, status_id)
VALUES
	(4, 'Medical Officer', 'MEDICAL_OFFICER', 1),
	(5, 'Consultant', 'CONSULTANT', 1)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
INSERT INTO document (id, document_type_id, code, document_text, document_number, document_setting_id, status_id)
VALUES (
	90007,
	2,
	'IP_BILL_PRINT',
	'<header class="print-doc-header"><strong>{{hospital.name}}</strong><br/>IP Bill No: {{document.number}} | Date: {{document.date}}<br/>Patient: {{patient.name}} ({{patient.code}})</header><dl class="meta"><div><dt>{{print.label_patient}}</dt><dd>{{patient.name}}</dd></div><div><dt>{{print.label_patient_code}}</dt><dd>{{patient.code}}</dd></div><div><dt>{{print.label_visit_no}}</dt><dd>{{visit.no}}</dd></div><div><dt>{{print.label_date}}</dt><dd>{{visit.date}}</dd></div><div><dt>{{print.label_doctor}}</dt><dd>{{doctor.name}}</dd></div><div><dt>{{print.label_branch}}</dt><dd>{{visit.department}}</dd></div></dl>{{print.body_html}}',
	'IP Bill',
	5,
	1
)
ON CONFLICT (id) DO UPDATE SET
	code = EXCLUDED.code,
	document_text = EXCLUDED.document_text,
	document_number = EXCLUDED.document_number;
--> statement-breakpoint
ALTER TABLE "medication_order_batch" ADD COLUMN IF NOT EXISTS "ordering_staff_id" uuid;
--> statement-breakpoint
ALTER TABLE "medication_order_batch" ADD COLUMN IF NOT EXISTS "consultant_cosigned_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "medication_order_batch" ADD COLUMN IF NOT EXISTS "consultant_cosigned_by" uuid;
