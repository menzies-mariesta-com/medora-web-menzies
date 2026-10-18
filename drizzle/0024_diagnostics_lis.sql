-- Diagnostics Phase 1: Core LIS (catalog, orders, accession, results, critical callback)

CREATE TABLE IF NOT EXISTS "hospital_lab_setting" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"accession_prefix" varchar(32) DEFAULT 'LAB' NOT NULL,
	"critical_policy" varchar(64) DEFAULT 'callback_after_release' NOT NULL,
	"auto_nursing_complete_on_release" boolean DEFAULT false NOT NULL,
	"enabled_sections_json" jsonb DEFAULT '["hematology","chemistry","microbiology"]'::jsonb NOT NULL,
	"label_format_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hospital_lab_setting_hospital_uidx" ON "hospital_lab_setting" ("hospital_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_test" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid REFERENCES "hospital"("id") ON DELETE CASCADE,
	"code" varchar(64) NOT NULL,
	"name" varchar(512) NOT NULL,
	"loinc_code" varchar(32),
	"section" varchar(32) NOT NULL,
	"data_type" varchar(16) DEFAULT 'numeric' NOT NULL,
	"unit" varchar(64),
	"ref_range_low" numeric(14, 4),
	"ref_range_high" numeric(14, 4),
	"ref_range_text" varchar(256),
	"critical_low" numeric(14, 4),
	"critical_high" numeric(14, 4),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_test_hospital_idx" ON "lab_test" ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_test_section_idx" ON "lab_test" ("section");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_panel" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid REFERENCES "hospital"("id") ON DELETE CASCADE,
	"code" varchar(64) NOT NULL,
	"name" varchar(512) NOT NULL,
	"section" varchar(32) NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_panel_hospital_idx" ON "lab_panel" ("hospital_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_panel_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"panel_id" integer NOT NULL REFERENCES "lab_panel"("id") ON DELETE CASCADE,
	"test_id" integer NOT NULL REFERENCES "lab_test"("id") ON DELETE CASCADE,
	"sort_order" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lab_panel_member_panel_test_uidx" ON "lab_panel_member" ("panel_id", "test_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_service_test_map" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"service_item_id" integer NOT NULL REFERENCES "service_item"("id") ON DELETE CASCADE,
	"target_type" varchar(16) NOT NULL,
	"target_id" integer NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lab_service_test_map_service_uidx" ON "lab_service_test_map" ("hospital_id", "service_item_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_order" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"branch_id" uuid NOT NULL REFERENCES "hospital_branch"("id"),
	"visit_id" uuid NOT NULL REFERENCES "patient_visit"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patient"("id") ON DELETE CASCADE,
	"service_order_detail_id" integer NOT NULL REFERENCES "service_order_detail"("id") ON DELETE CASCADE,
	"priority" varchar(16) DEFAULT 'routine' NOT NULL,
	"clinical_notes" text,
	"order_status" varchar(32) DEFAULT 'ordered' NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lab_order_service_order_detail_uidx" ON "lab_order" ("service_order_detail_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_order_visit_idx" ON "lab_order" ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_order_hospital_idx" ON "lab_order" ("hospital_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_accession" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"lab_order_id" integer NOT NULL REFERENCES "lab_order"("id") ON DELETE CASCADE,
	"accession_no" varchar(64) NOT NULL,
	"barcode_payload" varchar(256) NOT NULL,
	"section" varchar(32) NOT NULL,
	"accession_status" varchar(32) DEFAULT 'ordered' NOT NULL,
	"requested_tests_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"collection_site" varchar(256),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "lab_accession_no_hospital_uidx" ON "lab_accession" ("hospital_id", "accession_no");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_accession_status_idx" ON "lab_accession" ("hospital_id", "section", "accession_status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_specimen" (
	"id" serial PRIMARY KEY NOT NULL,
	"accession_id" integer NOT NULL REFERENCES "lab_accession"("id") ON DELETE CASCADE,
	"specimen_type" varchar(32) NOT NULL,
	"collected_at" timestamp with time zone,
	"collected_by" uuid REFERENCES "staff"("id"),
	"received_at" timestamp with time zone,
	"received_by" uuid REFERENCES "staff"("id"),
	"reject_reason" varchar(32),
	"reject_note" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_specimen_accession_idx" ON "lab_specimen" ("accession_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_result_report" (
	"id" serial PRIMARY KEY NOT NULL,
	"accession_id" integer NOT NULL REFERENCES "lab_accession"("id") ON DELETE CASCADE,
	"report_status" varchar(16) DEFAULT 'preliminary' NOT NULL,
	"released_at" timestamp with time zone,
	"released_by" uuid REFERENCES "staff"("id"),
	"verified_at" timestamp with time zone,
	"verified_by" uuid REFERENCES "staff"("id"),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_result_report_accession_idx" ON "lab_result_report" ("accession_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_result_observation" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL REFERENCES "lab_result_report"("id") ON DELETE CASCADE,
	"test_id" integer NOT NULL REFERENCES "lab_test"("id"),
	"value_numeric" numeric(14, 4),
	"value_text" text,
	"unit" varchar(64),
	"ref_range_text" varchar(256),
	"abnormal_flag" varchar(8),
	"is_critical" boolean DEFAULT false NOT NULL,
	"observation_status" varchar(16) DEFAULT 'draft' NOT NULL,
	"source" varchar(16) DEFAULT 'manual' NOT NULL,
	"entered_by" uuid REFERENCES "staff"("id"),
	"verified_by" uuid REFERENCES "staff"("id"),
	"verified_at" timestamp with time zone,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_result_observation_report_idx" ON "lab_result_observation" ("report_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_result_observation_critical_idx" ON "lab_result_observation" ("is_critical");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_critical_callback" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"observation_id" integer NOT NULL REFERENCES "lab_result_observation"("id") ON DELETE CASCADE,
	"visit_id" uuid NOT NULL REFERENCES "patient_visit"("id"),
	"patient_id" uuid NOT NULL REFERENCES "patient"("id"),
	"callback_status" varchar(32) DEFAULT 'open' NOT NULL,
	"called_party" varchar(256),
	"read_back_text" text,
	"called_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completed_by" uuid REFERENCES "staff"("id"),
	"assigned_staff_id" uuid REFERENCES "staff"("id"),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_critical_callback_hospital_status_idx" ON "lab_critical_callback" ("hospital_id", "callback_status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"entity_type" varchar(64) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(64) NOT NULL,
	"staff_id" uuid REFERENCES "staff"("id"),
	"detail_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_audit_entity_idx" ON "lab_audit" ("entity_type", "entity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_audit_hospital_idx" ON "lab_audit" ("hospital_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lab_integration_message" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL REFERENCES "hospital"("id") ON DELETE CASCADE,
	"direction" varchar(16) NOT NULL,
	"protocol" varchar(32) DEFAULT 'hl7_v2' NOT NULL,
	"raw_payload" text NOT NULL,
	"parse_status" varchar(16) DEFAULT 'pending' NOT NULL,
	"parse_error" text,
	"accession_no" varchar(64),
	"processed_at" timestamp with time zone,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lab_integration_message_hospital_status_idx" ON "lab_integration_message" ("hospital_id", "parse_status");
