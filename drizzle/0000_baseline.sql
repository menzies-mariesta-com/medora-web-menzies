CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role_id" integer,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_discount_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(512) NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "billing_discount_type_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "blood_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "city" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"state_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "country" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(128) NOT NULL,
	"image_url" text NOT NULL,
	"language" varchar(128) NOT NULL,
	"country_calling_code" varchar(128) NOT NULL,
	"status_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "craft_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512) NOT NULL,
	"status_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "department" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "diagnosis_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "form_name" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(128) NOT NULL,
	"name" varchar(512),
	"form_type" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "form_name_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "gender" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "identity_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "marital_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "nationality" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "position" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "postal_code" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" integer NOT NULL,
	"city_id" integer NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "refer_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "religion" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "severity" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "specialization" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"craft_group_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "staff_employment_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "staff_shift_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "staff_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "state" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"country_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "status" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "title" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "unit" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"unit_type_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "unit_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "visit_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "weekday" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "allergy" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "appointment_block" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" uuid NOT NULL,
	"hospital_id" uuid,
	"block_date" date NOT NULL,
	"from_time" time NOT NULL,
	"to_time" time NOT NULL,
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
CREATE TABLE "appointment" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid,
	"staff_id" uuid,
	"appointment_date" date,
	"from_time" time,
	"to_time" time,
	"patient_title_id" integer,
	"patient_name" varchar(512),
	"patient_date_of_birth" date,
	"patient_age_year" integer,
	"patient_age_month" integer,
	"patient_age_day" integer,
	"appointment_phone" varchar(128),
	"appointment_email" varchar(512),
	"refer_type_id" integer,
	"external_refer_id" integer,
	"status_tagging_id" integer,
	"remark" text,
	"cancel_remark" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "bed" (
	"id" serial PRIMARY KEY NOT NULL,
	"ward_id" integer NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(64),
	"bed_status" integer DEFAULT 1 NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "cpoe_prescription_note" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"delete_remark" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"doctor_id" uuid,
	"sequence_no" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "diagnosis" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" integer NOT NULL,
	"diagnosis_type_id" integer NOT NULL,
	"description" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "doctor_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" uuid NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"weekday_id" integer NOT NULL,
	"from_date" date,
	"to_date" date,
	"from_shift_time" time,
	"to_shift_time" time,
	"slot_duration_minutes" integer DEFAULT 15,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "document_setting" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512) NOT NULL,
	"document_type_id" integer,
	"hospital_id" uuid,
	"margin_top" integer DEFAULT 20,
	"margin_bottom" integer DEFAULT 20,
	"margin_left" integer DEFAULT 15,
	"margin_right" integer DEFAULT 15,
	"padding_top" integer DEFAULT 10,
	"padding_bottom" integer DEFAULT 10,
	"padding_left" integer DEFAULT 10,
	"padding_right" integer DEFAULT 10,
	"page_size" varchar(20) DEFAULT 'A4',
	"page_orientation" varchar(20) DEFAULT 'portrait',
	"header_html" text,
	"footer_html" text,
	"show_header" boolean DEFAULT true,
	"show_footer" boolean DEFAULT true,
	"description" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_type_id" integer NOT NULL,
	"code" varchar(128),
	"document_text" text,
	"document_number" varchar(128),
	"document_setting_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "document_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_type" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "external_refer" (
	"id" serial PRIMARY KEY NOT NULL,
	"refer_type_id" integer,
	"hospital_id" uuid,
	"title_id" integer,
	"name" varchar(512),
	"address" text,
	"country_id" integer,
	"state_id" integer,
	"city_id" integer,
	"postal_code_id" integer,
	"phone_country_id" integer,
	"phone" varchar(128),
	"email" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "financial_year" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"code" varchar(128),
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "financial_year_hospital_code_unique" UNIQUE("hospital_id","code")
);
--> statement-breakpoint
CREATE TABLE "hospital_branch" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"address" text,
	"phone" varchar(64),
	"phone_country_id" integer,
	"email" varchar(256),
	"postal_code_id" integer,
	"city_id" integer,
	"state_id" integer,
	"country_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "hospital_department" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"department_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "hospital" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"address" text,
	"phone" varchar(64),
	"phone_country_id" integer,
	"email" varchar(256),
	"website" varchar(512),
	"owner_id" text,
	"postal_code_id" integer,
	"city_id" integer,
	"state_id" integer,
	"country_id" integer,
	"logo_url" text,
	"description" text,
	"established_date" date,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "insurance_table" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "ip_billing_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip_billing_id" integer NOT NULL,
	"line_index" integer NOT NULL,
	"service_order_detail_id" integer,
	"medication_order_line_id" integer,
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
CREATE TABLE "ip_billing" (
	"id" serial PRIMARY KEY NOT NULL,
	"visit_id" integer NOT NULL,
	"admission_id" integer,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"bill_no" varchar(128),
	"lines_subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_type_id" integer DEFAULT 1 NOT NULL,
	"discount_percent" numeric(5, 2),
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discounted_by_staff_id" uuid,
	"discounted_at" timestamp with time zone,
	"printed_by_staff_id" uuid,
	"printed_at" timestamp with time zone,
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
CREATE TABLE "ipd_admission" (
	"id" serial PRIMARY KEY NOT NULL,
	"visit_id" integer NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"admission_no" varchar(128),
	"ward_id" integer NOT NULL,
	"bed_id" integer NOT NULL,
	"admitting_doctor_id" uuid,
	"admitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"discharged_at" timestamp with time zone,
	"reason_notes" text,
	"admission_status" integer DEFAULT 1 NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "ipd_bed_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"admission_id" integer NOT NULL,
	"from_bed_id" integer,
	"to_bed_id" integer NOT NULL,
	"from_ward_id" integer,
	"to_ward_id" integer NOT NULL,
	"moved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"moved_by_staff_id" uuid,
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "item_master_item_unit_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"item_master_id" integer NOT NULL,
	"item_unit_master_id" integer NOT NULL,
	"is_default_yes_no" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "im_ium_is_default_yes_no_chk" CHECK ("item_master_item_unit_master"."is_default_yes_no" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE "item_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"item_name" varchar(512) NOT NULL,
	"category_id" integer NOT NULL,
	"item_code" varchar(128),
	"manufacturer_name" varchar(512),
	"pharmacy_generic_id" integer,
	"description" text,
	"remark" text,
	"expiry_alert_lead_days" integer,
	"item_markup_percent" numeric(8, 2) DEFAULT '0' NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "item_master_category_supply_chk" CHECK (("item_master"."category_id") IN (11, 12, 13)),
	CONSTRAINT "item_master_pharmacy_supply_generic_chk" CHECK (("item_master"."category_id") <> 12 OR "item_master"."pharmacy_generic_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "item_unit_master" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"purchase_unit_id" integer NOT NULL,
	"purchase_conversion_factor" numeric(18, 6) NOT NULL,
	"issue_unit_id" integer NOT NULL,
	"issue_conversion_factor" numeric(18, 6) NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "item_unit_master_factors_positive_chk" CHECK ("item_unit_master"."purchase_conversion_factor"::numeric > 0 AND "item_unit_master"."issue_conversion_factor"::numeric > 0)
);
--> statement-breakpoint
CREATE TABLE "module" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"image_url" text,
	"module_url" text,
	"sequence_no" integer,
	"status_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "op_billing_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"op_billing_id" integer NOT NULL,
	"line_index" integer NOT NULL,
	"service_order_detail_id" integer,
	"medication_order_line_id" integer,
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
CREATE TABLE "op_billing" (
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
	"discounted_by_staff_id" uuid,
	"discounted_at" timestamp with time zone,
	"printed_by_staff_id" uuid,
	"printed_at" timestamp with time zone,
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
CREATE TABLE "page" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"parent_id" integer,
	"image_url" text,
	"page_url" text,
	"sequence_no" integer,
	"module_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "patient_allergy" (
	"id" serial PRIMARY KEY NOT NULL,
	"visit_id" integer NOT NULL,
	"patient_id" uuid NOT NULL,
	"allergy_id" integer NOT NULL,
	"severity_id" integer NOT NULL,
	"reaction" text,
	"remark" text,
	"deactivation_remark" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "patient_attachment" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"file_url" text,
	"description" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "patient_diagnosis" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"hospital_id" uuid NOT NULL,
	"visit_id" integer NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"height" numeric(10, 2),
	"height_unit_id" integer,
	"weight" numeric(10, 2),
	"weight_unit_id" integer,
	"bp_systolic" numeric(10, 2),
	"bp_diastolic" numeric(10, 2),
	"bp_unit_id" integer,
	"pulse" numeric(10, 2),
	"pulse_unit_id" integer,
	"temperature" numeric(10, 2),
	"temperature_unit_id" integer,
	"sp_o2" numeric(10, 2),
	"sp_o2_unit_id" integer,
	"respiration" numeric(10, 2),
	"respiration_unit_id" integer,
	"rbs" numeric(10, 2),
	"rbs_unit_id" integer,
	"bmi" numeric(10, 2),
	"symptom" text,
	"description" text,
	"remark" text,
	"vital_date_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "patient_document" (
	"id" serial PRIMARY KEY NOT NULL,
	"visit_id" integer NOT NULL,
	"patient_id" uuid NOT NULL,
	"document_id" integer NOT NULL,
	"patient_attachment_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "patient_form_entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" integer NOT NULL,
	"form_name_id" integer NOT NULL,
	"description" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "patient_insurance" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"insurance_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "patient" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"code" varchar(512),
	"title_id" integer,
	"first_name" varchar(512),
	"middle_name" varchar(512),
	"last_name" varchar(512),
	"user_id" text NOT NULL,
	"phone_primary" varchar(128),
	"phone_secondary" varchar(128),
	"identity_no" varchar(128),
	"date_of_birth" date,
	"father_title_id" integer,
	"father_name" varchar(512),
	"guardian_title_id" integer,
	"guardian_name" varchar(512),
	"guardian_phone" varchar(128),
	"guardian_phone_country_id" integer,
	"photo_path" text,
	"address" text,
	"remark" text,
	"name_masking" integer DEFAULT 0 NOT NULL,
	"phone_primary_country_id" integer,
	"phone_secondary_country_id" integer,
	"marital_status_id" integer,
	"gender_id" integer,
	"identity_type_id" integer,
	"blood_type_id" integer,
	"city_id" integer,
	"state_id" integer,
	"country_id" integer,
	"postal_code_id" integer,
	"nationality_id" integer,
	"religion_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "patient_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "patient_visit" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"appointment_id" integer,
	"doctor_id" uuid,
	"status_tagging_id" integer,
	"visit_type_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"visit_no" varchar(128),
	"chief_complaint" text,
	"patient_condition" text,
	"diagnosis_notes" text,
	"clinical_signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "pharmacy_generic" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "plan_of_care" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"delete_remark" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"doctor_id" uuid,
	"sequence_no" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "prefix_counter" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid,
	"financial_year_id" integer,
	"visit_type_id" integer,
	"key" varchar(128) NOT NULL,
	"scope_key" text NOT NULL,
	"last_no" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prefix_counter_scope_key_unique" UNIQUE("scope_key")
);
--> statement-breakpoint
CREATE TABLE "prefix_format" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"key" varchar(128) NOT NULL,
	"description" text,
	"format" jsonb NOT NULL,
	"counter_include_branch" integer DEFAULT 0 NOT NULL,
	"counter_include_financial_year" integer DEFAULT 1 NOT NULL,
	"counter_include_visit_type" integer DEFAULT 0 NOT NULL,
	"counter_include_visit" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "prefix_format_hospital_key_unique" UNIQUE("hospital_id","key")
);
--> statement-breakpoint
CREATE TABLE "progress_note" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"visit_id" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"delete_remark" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"doctor_id" uuid,
	"sequence_no" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "refer_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"visit_id" integer NOT NULL,
	"refer_at" timestamp with time zone DEFAULT now() NOT NULL,
	"from_branch_id" uuid,
	"to_branch_id" uuid,
	"from_refer_doctorid" uuid,
	"to_refer_doctorid" uuid,
	"is_urgent" integer DEFAULT 0,
	"refer_request_note" text,
	"accept_at" timestamp with time zone,
	"cancel_by" text,
	"cancel_at" timestamp with time zone,
	"cancel_remark" text,
	"refer_reply_note" text,
	"subject" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "service_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"sub_category_id" integer NOT NULL,
	"service_name" varchar(512),
	"service_code" varchar(128),
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
CREATE TABLE "service_order_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_order_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"advising_doctor_id" uuid,
	"instruction" text,
	"is_urgent" boolean DEFAULT false NOT NULL,
	"discount" numeric(10, 2),
	"service_amount" numeric(10, 2),
	"service_tax_amount" numeric(10, 2),
	"service_unit" integer,
	"nursing_complete_time" timestamp with time zone,
	"status_id" integer DEFAULT 1 NOT NULL,
	"cancel_by" text,
	"cancel_remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "service_order" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" uuid NOT NULL,
	"order_date" date,
	"order_time" time,
	"order_no" varchar(128),
	"visit_id" integer NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "service_tagging" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" uuid NOT NULL,
	"service_id" integer NOT NULL,
	"valid_date" date,
	"service_amount" numeric(10, 2),
	"service_tax_amount" numeric(10, 2),
	"allow_edit" boolean DEFAULT true NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "staff_branch" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "staff_branch_staff_id_branch_id_unique" UNIQUE("staff_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "staff_department" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" uuid NOT NULL,
	"department_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "staff_detail" (
	"id" serial PRIMARY KEY NOT NULL,
	"license_no" varchar(512),
	"license_expiry_date" date,
	"signature_image_url" text,
	"signature_text" text,
	"designation" varchar(512),
	"education" varchar(512),
	"blood_type_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "staff_hospital" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" uuid NOT NULL,
	"hospital_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"first_name" varchar(512),
	"middle_name" varchar(512),
	"last_name" varchar(512),
	"code" varchar(512),
	"phone_primary" varchar(128),
	"phone_secondary" varchar(128),
	"phone_primary_country_id" integer,
	"phone_secondary_country_id" integer,
	"date_of_birth" date,
	"join_date" date,
	"resign_date" date,
	"photo_url" text,
	"address" text,
	"remark" text,
	"identity_no" varchar(128),
	"identity_type_id" integer,
	"title_id" integer,
	"staff_employment_type_id" integer,
	"staff_type_id" integer,
	"staff_detail_id" integer,
	"city_id" integer,
	"state_id" integer,
	"country_id" integer,
	"marital_status_id" integer,
	"nationality_id" integer,
	"position_id" integer,
	"postal_code_id" integer,
	"specialization_id" integer,
	"gender_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "staff_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "staff_user_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" uuid NOT NULL,
	"user_group_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "staff_user_group_staff_id_user_group_id_unique" UNIQUE("staff_id","user_group_id")
);
--> statement-breakpoint
CREATE TABLE "status_tagging" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"sequence_no" integer,
	"status_tagging_type_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "status_tagging_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "store" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" uuid NOT NULL,
	"is_purchase_requisitable" boolean DEFAULT false NOT NULL,
	"store_name" varchar(512),
	"remark" text,
	"store_markup_percent" numeric(8, 2) DEFAULT '0' NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "store_user_group" (
	"store_id" integer NOT NULL,
	"user_group_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	CONSTRAINT "store_user_group_pk" PRIMARY KEY("store_id","user_group_id")
);
--> statement-breakpoint
CREATE TABLE "sub_category" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"sub_category_name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "supplier" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(128),
	"address" text,
	"phone" varchar(64),
	"phone_country_id" integer,
	"email" varchar(256),
	"postal_code_id" integer,
	"city_id" integer,
	"state_id" integer,
	"country_id" integer,
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
CREATE TABLE "support_ticket" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" varchar(512) NOT NULL,
	"description" text NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"priority" integer DEFAULT 2 NOT NULL,
	"requester_id" text NOT NULL,
	"hospital_id" uuid,
	"context_url" text,
	"assigned_to_user_id" text,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "user_group_page" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_group_id" integer,
	"page_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "user_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"hospital_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "ward" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid,
	"name" varchar(512) NOT NULL,
	"code" varchar(64),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"grn_id" uuid NOT NULL,
	"po_line_id" integer,
	"item_id" integer NOT NULL,
	"purchased_qty" numeric(18, 0) NOT NULL,
	"batch_no" varchar(128),
	"expiry_date" date,
	"unit_id" integer NOT NULL,
	"batch_id" integer,
	"purchase_price" numeric(14, 2),
	"free_qty" numeric(18, 0) DEFAULT '0' NOT NULL,
	"free_unit_id" integer,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_percent" numeric(8, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_percent" numeric(8, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_note" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"po_id" uuid,
	"supplier_id" integer,
	"store_id" integer NOT NULL,
	"invoice_no" varchar(128),
	"invoice_date" date,
	"invoice_amount" numeric(14, 2),
	"invoice_discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"invoice_discount_percent" numeric(8, 2) DEFAULT '0' NOT NULL,
	"invoice_tax_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"invoice_tax_percent" numeric(8, 2) DEFAULT '0' NOT NULL,
	"invoice_photo_url" text,
	"received_by" text NOT NULL,
	"received_date" date NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"cancelled_by" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "goods_receipt_note_po_or_supplier_chk" CHECK ("goods_receipt_note"."po_id" is not null or "goods_receipt_note"."supplier_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "inv_approval_assignee" (
	"id" serial PRIMARY KEY NOT NULL,
	"level_id" integer NOT NULL,
	"staff_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_approval_level" (
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
	CONSTRAINT "inv_approval_level_module_chk" CHECK ("inv_approval_level"."module" IN ('PR', 'PO', 'DI', 'DISS', 'RFS', 'GRN', 'DC')),
	CONSTRAINT "inv_approval_level_level_positive_chk" CHECK ("inv_approval_level"."level" >= 1)
);
--> statement-breakpoint
CREATE TABLE "inv_approval_log" (
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
	CONSTRAINT "inv_approval_log_module_chk" CHECK ("inv_approval_log"."module" IN ('PR', 'PO', 'DI', 'DISS', 'RFS', 'GRN', 'DC'))
);
--> statement-breakpoint
CREATE TABLE "inv_department_consumption_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"consumption_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric(18, 0) NOT NULL,
	"unit_id" integer NOT NULL,
	"batch_id" integer NOT NULL,
	"emp_sale_price" numeric(14, 2),
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "inv_department_consumption" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"consumption_no" varchar(128),
	"store_id" integer NOT NULL,
	"requested_by" text NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"remarks" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"cancelled_by" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "inv_department_indent_line_alloc" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" integer NOT NULL,
	"batch_id" integer NOT NULL,
	"quantity" numeric(18, 0) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_department_indent_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"indent_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric(18, 0) NOT NULL,
	"unit_id" integer NOT NULL,
	"qty_issued" numeric(18, 0) DEFAULT '0' NOT NULL,
	"batch_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "inv_department_indent" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"indent_no" varchar(128),
	"from_store_id" integer NOT NULL,
	"to_store_id" integer NOT NULL,
	"requested_by" text NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"remarks" text,
	"from_approved_by" text,
	"from_approved_at" timestamp with time zone,
	"issued_by" text,
	"issued_at" timestamp with time zone,
	"received_by" text,
	"received_at" timestamp with time zone,
	"cancelled_by" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "inv_department_indent_from_to_distinct_chk" CHECK ("inv_department_indent"."from_store_id" <> "inv_department_indent"."to_store_id")
);
--> statement-breakpoint
CREATE TABLE "inv_department_issue_line_alloc" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" integer NOT NULL,
	"batch_id" integer NOT NULL,
	"quantity" numeric(18, 0) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_department_issue_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric(18, 0) NOT NULL,
	"unit_id" integer NOT NULL,
	"qty_issued" numeric(18, 0) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "inv_department_issue" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"issue_no" varchar(128),
	"source_indent_id" uuid,
	"from_store_id" integer NOT NULL,
	"to_store_id" integer NOT NULL,
	"requested_by" text NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"remarks" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"issued_by" text,
	"issued_at" timestamp with time zone,
	"received_by" text,
	"received_at" timestamp with time zone,
	"cancelled_by" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "inv_department_issue_stores_distinct_chk" CHECK ("inv_department_issue"."from_store_id" <> "inv_department_issue"."to_store_id")
);
--> statement-breakpoint
CREATE TABLE "inv_item_reorder_level" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"store_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"min_qty" numeric(18, 0) DEFAULT '0' NOT NULL,
	"item_unit_master_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "inv_module_pricing_assignment" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"module" varchar(16) NOT NULL,
	"formula_template_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inv_module_pricing_assignment_module_chk" CHECK (("inv_module_pricing_assignment"."module") IN ('IS', 'ES', 'DC'))
);
--> statement-breakpoint
CREATE TABLE "inv_pricing_formula_template" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"formula_version" integer DEFAULT 1 NOT NULL,
	"include_discount" boolean DEFAULT true NOT NULL,
	"include_tax" boolean DEFAULT true NOT NULL,
	"include_free_qty" boolean DEFAULT false NOT NULL,
	"include_item_markup" boolean DEFAULT true NOT NULL,
	"include_store_markup" boolean DEFAULT true NOT NULL,
	"msl_markup_percent" numeric(8, 2) DEFAULT '0' NOT NULL,
	"slot_order" jsonb DEFAULT '["COST","MSL","ITEM","STORE"]'::jsonb NOT NULL,
	"is_system_default" boolean DEFAULT false NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_stock_alert_email_sent" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"store_id" integer NOT NULL,
	"recipient_staff_id" uuid NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"payload_digest" varchar(32),
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inv_stock_alert_recipient" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"store_id" integer NOT NULL,
	"staff_id" uuid NOT NULL,
	"notify_low_stock" boolean DEFAULT true NOT NULL,
	"notify_expired" boolean DEFAULT true NOT NULL,
	"notify_expiring_soon" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "inv_stock_alert_setting" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"default_expiring_soon_days" integer DEFAULT 30 NOT NULL,
	"email_low_stock" boolean DEFAULT false NOT NULL,
	"email_expired" boolean DEFAULT false NOT NULL,
	"email_expiring_soon" boolean DEFAULT false NOT NULL,
	"email_min_gap_minutes" integer DEFAULT 360 NOT NULL,
	"in_app_min_gap_minutes" integer DEFAULT 360 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inv_stock_alert_setting_hospital_id_unique" UNIQUE("hospital_id")
);
--> statement-breakpoint
CREATE TABLE "inv_stock_issue_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"issue_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"qty" numeric(18, 0) NOT NULL,
	"unit_id" integer NOT NULL,
	"batch_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "inv_stock_issue" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"store_id" integer NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"issued_to" text,
	"reason" text,
	"posted_at" timestamp with time zone,
	"requested_by" text NOT NULL,
	"cancelled_by" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "inv_stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"batch_id" integer NOT NULL,
	"quantity" numeric(18, 0) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "inv_store_transfer_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"transfer_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric(18, 0) NOT NULL,
	"unit_id" integer NOT NULL,
	"batch_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "inv_store_transfer" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"from_store_id" integer NOT NULL,
	"to_store_id" integer NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"requested_by" text NOT NULL,
	"approved_by" text,
	"posted_at" timestamp with time zone,
	"remark" text,
	"source_grn_id" uuid,
	"cancelled_by" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "inv_store_transfer_stores_distinct_chk" CHECK ("inv_store_transfer"."from_store_id" <> "inv_store_transfer"."to_store_id")
);
--> statement-breakpoint
CREATE TABLE "item_batch" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"batch_no" varchar(128) NOT NULL,
	"expiry_date" date,
	"supplier_id" integer,
	"goods_receipt_note_id" uuid,
	"goods_receipt_line_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"po_id" uuid NOT NULL,
	"pr_line_id" integer,
	"item_id" integer NOT NULL,
	"quantity" numeric(18, 0) NOT NULL,
	"unit_id" integer NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL,
	"qty_received_cumulative" numeric(18, 0) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "purchase_order" (
	"id" uuid PRIMARY KEY NOT NULL,
	"po_no" varchar(128),
	"hospital_id" uuid NOT NULL,
	"pr_id" uuid,
	"store_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"sent_to_supplier_at" timestamp with time zone,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "purchase_requisition_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"pr_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric(18, 0) NOT NULL,
	"requested_quantity" numeric(18, 0) NOT NULL,
	"unit_id" integer NOT NULL,
	"qty_remaining" numeric(18, 0) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "purchase_requisition" (
	"id" uuid PRIMARY KEY NOT NULL,
	"pr_no" varchar(128),
	"hospital_id" uuid NOT NULL,
	"from_store_id" integer NOT NULL,
	"to_store_id" integer NOT NULL,
	"requested_by" text NOT NULL,
	"status_tagging_id" integer NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"remarks" text,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"cancelled_by" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_dose_unit_inactive" (
	"hospital_id" uuid NOT NULL,
	"dose_unit_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_dose_unit" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_preset" boolean DEFAULT false NOT NULL,
	"name" varchar(512) NOT NULL,
	"description" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_duration_unit_inactive" (
	"hospital_id" uuid NOT NULL,
	"duration_unit_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_duration_unit" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_preset" boolean DEFAULT false NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(512) NOT NULL,
	"sequence_no" integer DEFAULT 0 NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_food_relation_inactive" (
	"hospital_id" uuid NOT NULL,
	"food_relation_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_food_relation" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_preset" boolean DEFAULT false NOT NULL,
	"name" varchar(512) NOT NULL,
	"description" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_form_inactive" (
	"hospital_id" uuid NOT NULL,
	"form_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_form" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_preset" boolean DEFAULT false NOT NULL,
	"name" varchar(512) NOT NULL,
	"description" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_frequency_inactive" (
	"hospital_id" uuid NOT NULL,
	"frequency_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_frequency" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(512) NOT NULL,
	"is_preset" boolean DEFAULT false NOT NULL,
	"description" text,
	"abbreviation" varchar(64),
	"frequency_per_day" numeric(18, 6),
	"sequence_no" integer DEFAULT 0 NOT NULL,
	"is_common_frequency" boolean DEFAULT false NOT NULL,
	"is_timing_required" boolean DEFAULT false NOT NULL,
	"diff_plot_one_hourly_value" integer,
	"diff_plot_two_hourly_value" integer,
	"diff_plot_half_hourly_value" integer,
	"diff_plot_four_hourly_value" integer,
	"diff_plot_six_hourly_value" integer,
	"variable_dose" boolean DEFAULT false NOT NULL,
	"pictorial_definition" text,
	"is_frequency_infusion" boolean DEFAULT false NOT NULL,
	"local_language" text,
	"kind" varchar(64) DEFAULT 'custom' NOT NULL,
	"summary_text" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_order_type_inactive" (
	"hospital_id" uuid NOT NULL,
	"order_type_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_order_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_preset" boolean DEFAULT false NOT NULL,
	"name" varchar(512) NOT NULL,
	"description" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_route_inactive" (
	"hospital_id" uuid NOT NULL,
	"route_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "med_order_route" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_preset" boolean DEFAULT false NOT NULL,
	"name" varchar(512) NOT NULL,
	"description" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "medication_order_batch_payment" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"batch_id" integer NOT NULL,
	"payment_method" varchar(64) DEFAULT 'cash' NOT NULL,
	"amount_due" numeric(14, 2) NOT NULL,
	"amount_paid" numeric(14, 2) NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"receipt_no" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "medication_order_batch" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"visit_id" integer,
	"store_id" integer NOT NULL,
	"ext_customer_name" varchar(512),
	"advising_doctor" varchar(512),
	"batch_no" varchar(256) NOT NULL,
	"batch_remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "medication_order_line_allocation" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_id" integer NOT NULL,
	"batch_id" integer NOT NULL,
	"qty_purchase" numeric(18, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "medication_order_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"line_no" integer DEFAULT 1 NOT NULL,
	"item_master_id" integer NOT NULL,
	"dose" numeric(18, 6) NOT NULL,
	"dose_unit_id" integer NOT NULL,
	"frequency_id" integer NOT NULL,
	"duration_value" numeric(18, 6) NOT NULL,
	"duration_unit_id" integer NOT NULL,
	"form_id" integer,
	"route_id" integer,
	"order_type_id" integer,
	"food_relation_id" integer,
	"start_at" timestamp with time zone NOT NULL,
	"test_dose" text,
	"substitute_not_allowed" boolean DEFAULT false NOT NULL,
	"item_unit_master_id" integer,
	"qty_out" numeric(18, 6),
	"out_unit_id" integer,
	"unit_sale_price" numeric(14, 2),
	"line_remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_staff_id" uuid NOT NULL,
	"hospital_id" uuid,
	"event_type" varchar(64) NOT NULL,
	"severity" varchar(16) DEFAULT 'info' NOT NULL,
	"title" text,
	"message" text NOT NULL,
	"link" text,
	"visit_id" integer,
	"refer_history_id" integer,
	"read_at" timestamp with time zone,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "marketplace_allowed_file_extension" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(64),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_app_archive" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" varchar(100) NOT NULL,
	"download_url" text NOT NULL,
	"app_id" integer NOT NULL,
	"file_extension_id" integer NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_app_form" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(128),
	"app_id" integer NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_app" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512) NOT NULL,
	"code" varchar(128),
	"signature" varchar(128) NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_discount_type" ADD CONSTRAINT "billing_discount_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_discount_type" ADD CONSTRAINT "billing_discount_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "billing_discount_type" ADD CONSTRAINT "billing_discount_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "billing_discount_type" ADD CONSTRAINT "billing_discount_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "blood_type" ADD CONSTRAINT "blood_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_type" ADD CONSTRAINT "blood_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "blood_type" ADD CONSTRAINT "blood_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "blood_type" ADD CONSTRAINT "blood_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "city" ADD CONSTRAINT "city_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city" ADD CONSTRAINT "city_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city" ADD CONSTRAINT "city_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "city" ADD CONSTRAINT "city_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "city" ADD CONSTRAINT "city_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "country" ADD CONSTRAINT "country_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country" ADD CONSTRAINT "country_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "country" ADD CONSTRAINT "country_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "country" ADD CONSTRAINT "country_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "craft_group" ADD CONSTRAINT "craft_group_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craft_group" ADD CONSTRAINT "craft_group_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "craft_group" ADD CONSTRAINT "craft_group_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "craft_group" ADD CONSTRAINT "craft_group_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "diagnosis_type" ADD CONSTRAINT "diagnosis_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis_type" ADD CONSTRAINT "diagnosis_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "diagnosis_type" ADD CONSTRAINT "diagnosis_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "diagnosis_type" ADD CONSTRAINT "diagnosis_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_name" ADD CONSTRAINT "form_name_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_name" ADD CONSTRAINT "form_name_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_name" ADD CONSTRAINT "form_name_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_name" ADD CONSTRAINT "form_name_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "gender" ADD CONSTRAINT "gender_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gender" ADD CONSTRAINT "gender_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "gender" ADD CONSTRAINT "gender_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "gender" ADD CONSTRAINT "gender_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "identity_type" ADD CONSTRAINT "identity_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_type" ADD CONSTRAINT "identity_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "identity_type" ADD CONSTRAINT "identity_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "identity_type" ADD CONSTRAINT "identity_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "marital_status" ADD CONSTRAINT "marital_status_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marital_status" ADD CONSTRAINT "marital_status_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "marital_status" ADD CONSTRAINT "marital_status_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "marital_status" ADD CONSTRAINT "marital_status_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nationality" ADD CONSTRAINT "nationality_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nationality" ADD CONSTRAINT "nationality_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nationality" ADD CONSTRAINT "nationality_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "nationality" ADD CONSTRAINT "nationality_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "position" ADD CONSTRAINT "position_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position" ADD CONSTRAINT "position_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "position" ADD CONSTRAINT "position_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "position" ADD CONSTRAINT "position_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "postal_code" ADD CONSTRAINT "postal_code_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postal_code" ADD CONSTRAINT "postal_code_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postal_code" ADD CONSTRAINT "postal_code_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "postal_code" ADD CONSTRAINT "postal_code_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "postal_code" ADD CONSTRAINT "postal_code_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "refer_type" ADD CONSTRAINT "refer_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refer_type" ADD CONSTRAINT "refer_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "refer_type" ADD CONSTRAINT "refer_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "refer_type" ADD CONSTRAINT "refer_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "religion" ADD CONSTRAINT "religion_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "religion" ADD CONSTRAINT "religion_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "religion" ADD CONSTRAINT "religion_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "religion" ADD CONSTRAINT "religion_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "severity" ADD CONSTRAINT "severity_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "severity" ADD CONSTRAINT "severity_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "severity" ADD CONSTRAINT "severity_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "severity" ADD CONSTRAINT "severity_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "specialization" ADD CONSTRAINT "specialization_craft_group_id_craft_group_id_fk" FOREIGN KEY ("craft_group_id") REFERENCES "public"."craft_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialization" ADD CONSTRAINT "specialization_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialization" ADD CONSTRAINT "specialization_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "specialization" ADD CONSTRAINT "specialization_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "specialization" ADD CONSTRAINT "specialization_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_employment_type" ADD CONSTRAINT "staff_employment_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_employment_type" ADD CONSTRAINT "staff_employment_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_employment_type" ADD CONSTRAINT "staff_employment_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_employment_type" ADD CONSTRAINT "staff_employment_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_shift_type" ADD CONSTRAINT "staff_shift_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shift_type" ADD CONSTRAINT "staff_shift_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_shift_type" ADD CONSTRAINT "staff_shift_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_shift_type" ADD CONSTRAINT "staff_shift_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_type" ADD CONSTRAINT "staff_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_type" ADD CONSTRAINT "staff_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_type" ADD CONSTRAINT "staff_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_type" ADD CONSTRAINT "staff_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "state" ADD CONSTRAINT "state_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state" ADD CONSTRAINT "state_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state" ADD CONSTRAINT "state_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "state" ADD CONSTRAINT "state_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "state" ADD CONSTRAINT "state_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "status" ADD CONSTRAINT "status_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "status" ADD CONSTRAINT "status_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "status" ADD CONSTRAINT "status_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "title" ADD CONSTRAINT "title_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title" ADD CONSTRAINT "title_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "title" ADD CONSTRAINT "title_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "title" ADD CONSTRAINT "title_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_unit_type_id_unit_type_id_fk" FOREIGN KEY ("unit_type_id") REFERENCES "public"."unit_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "unit_type" ADD CONSTRAINT "unit_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_type" ADD CONSTRAINT "unit_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "unit_type" ADD CONSTRAINT "unit_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "unit_type" ADD CONSTRAINT "unit_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "visit_type" ADD CONSTRAINT "visit_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_type" ADD CONSTRAINT "visit_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "visit_type" ADD CONSTRAINT "visit_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "visit_type" ADD CONSTRAINT "visit_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekday" ADD CONSTRAINT "weekday_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekday" ADD CONSTRAINT "weekday_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekday" ADD CONSTRAINT "weekday_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "weekday" ADD CONSTRAINT "weekday_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "allergy" ADD CONSTRAINT "allergy_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allergy" ADD CONSTRAINT "allergy_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "allergy" ADD CONSTRAINT "allergy_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "allergy" ADD CONSTRAINT "allergy_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointment_block" ADD CONSTRAINT "appointment_block_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_block" ADD CONSTRAINT "appointment_block_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_block" ADD CONSTRAINT "appointment_block_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_block" ADD CONSTRAINT "appointment_block_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointment_block" ADD CONSTRAINT "appointment_block_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointment_block" ADD CONSTRAINT "appointment_block_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_patient_title_id_title_id_fk" FOREIGN KEY ("patient_title_id") REFERENCES "public"."title"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_refer_type_id_refer_type_id_fk" FOREIGN KEY ("refer_type_id") REFERENCES "public"."refer_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_external_refer_id_external_refer_id_fk" FOREIGN KEY ("external_refer_id") REFERENCES "public"."external_refer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bed" ADD CONSTRAINT "bed_ward_id_ward_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."ward"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed" ADD CONSTRAINT "bed_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed" ADD CONSTRAINT "bed_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bed" ADD CONSTRAINT "bed_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bed" ADD CONSTRAINT "bed_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "bed" ADD CONSTRAINT "bed_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cpoe_prescription_note" ADD CONSTRAINT "cpoe_prescription_note_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cpoe_prescription_note" ADD CONSTRAINT "cpoe_prescription_note_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cpoe_prescription_note" ADD CONSTRAINT "cpoe_prescription_note_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cpoe_prescription_note" ADD CONSTRAINT "cpoe_prescription_note_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cpoe_prescription_note" ADD CONSTRAINT "cpoe_prescription_note_doctor_id_staff_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cpoe_prescription_note" ADD CONSTRAINT "cpoe_prescription_note_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cpoe_prescription_note" ADD CONSTRAINT "cpoe_prescription_note_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cpoe_prescription_note" ADD CONSTRAINT "cpoe_prescription_note_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "diagnosis" ADD CONSTRAINT "diagnosis_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis" ADD CONSTRAINT "diagnosis_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis" ADD CONSTRAINT "diagnosis_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis" ADD CONSTRAINT "diagnosis_diagnosis_type_id_diagnosis_type_id_fk" FOREIGN KEY ("diagnosis_type_id") REFERENCES "public"."diagnosis_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis" ADD CONSTRAINT "diagnosis_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis" ADD CONSTRAINT "diagnosis_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "diagnosis" ADD CONSTRAINT "diagnosis_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "diagnosis" ADD CONSTRAINT "diagnosis_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_weekday_id_weekday_id_fk" FOREIGN KEY ("weekday_id") REFERENCES "public"."weekday"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document_setting" ADD CONSTRAINT "document_setting_document_type_id_document_type_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_setting" ADD CONSTRAINT "document_setting_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_setting" ADD CONSTRAINT "document_setting_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_setting" ADD CONSTRAINT "document_setting_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document_setting" ADD CONSTRAINT "document_setting_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document_setting" ADD CONSTRAINT "document_setting_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_document_type_id_document_type_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_document_setting_id_document_setting_id_fk" FOREIGN KEY ("document_setting_id") REFERENCES "public"."document_setting"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document_type" ADD CONSTRAINT "document_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_type" ADD CONSTRAINT "document_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document_type" ADD CONSTRAINT "document_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "document_type" ADD CONSTRAINT "document_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_refer_type_id_refer_type_id_fk" FOREIGN KEY ("refer_type_id") REFERENCES "public"."refer_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_title_id_title_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."title"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_postal_code_id_postal_code_id_fk" FOREIGN KEY ("postal_code_id") REFERENCES "public"."postal_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_phone_country_id_country_id_fk" FOREIGN KEY ("phone_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "financial_year" ADD CONSTRAINT "financial_year_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_year" ADD CONSTRAINT "financial_year_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "financial_year" ADD CONSTRAINT "financial_year_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "financial_year" ADD CONSTRAINT "financial_year_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_phone_country_id_country_id_fk" FOREIGN KEY ("phone_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_postal_code_id_postal_code_id_fk" FOREIGN KEY ("postal_code_id") REFERENCES "public"."postal_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hospital_department" ADD CONSTRAINT "hospital_department_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_department" ADD CONSTRAINT "hospital_department_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_department" ADD CONSTRAINT "hospital_department_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hospital_department" ADD CONSTRAINT "hospital_department_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hospital_department" ADD CONSTRAINT "hospital_department_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_phone_country_id_country_id_fk" FOREIGN KEY ("phone_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_postal_code_id_postal_code_id_fk" FOREIGN KEY ("postal_code_id") REFERENCES "public"."postal_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "insurance_table" ADD CONSTRAINT "insurance_table_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_table" ADD CONSTRAINT "insurance_table_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "insurance_table" ADD CONSTRAINT "insurance_table_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "insurance_table" ADD CONSTRAINT "insurance_table_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ip_billing_line" ADD CONSTRAINT "ip_billing_line_ip_billing_id_ip_billing_id_fk" FOREIGN KEY ("ip_billing_id") REFERENCES "public"."ip_billing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_billing_line" ADD CONSTRAINT "ip_billing_line_service_order_detail_id_service_order_detail_id_fk" FOREIGN KEY ("service_order_detail_id") REFERENCES "public"."service_order_detail"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_billing_line" ADD CONSTRAINT "ip_billing_line_service_id_service_item_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_billing_line" ADD CONSTRAINT "ip_billing_line_sub_category_id_sub_category_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."sub_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_billing_line" ADD CONSTRAINT "ip_billing_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ip_billing_line" ADD CONSTRAINT "ip_billing_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ip_billing_line" ADD CONSTRAINT "ip_billing_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_admission_id_ipd_admission_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."ipd_admission"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_discount_type_id_billing_discount_type_id_fk" FOREIGN KEY ("discount_type_id") REFERENCES "public"."billing_discount_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_discounted_by_staff_id_staff_id_fk" FOREIGN KEY ("discounted_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_printed_by_staff_id_staff_id_fk" FOREIGN KEY ("printed_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ip_billing" ADD CONSTRAINT "ip_billing_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_ward_id_ward_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."ward"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_bed_id_bed_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."bed"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_admitting_doctor_id_staff_id_fk" FOREIGN KEY ("admitting_doctor_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD CONSTRAINT "ipd_bed_history_admission_id_ipd_admission_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."ipd_admission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD CONSTRAINT "ipd_bed_history_from_bed_id_bed_id_fk" FOREIGN KEY ("from_bed_id") REFERENCES "public"."bed"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD CONSTRAINT "ipd_bed_history_to_bed_id_bed_id_fk" FOREIGN KEY ("to_bed_id") REFERENCES "public"."bed"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD CONSTRAINT "ipd_bed_history_from_ward_id_ward_id_fk" FOREIGN KEY ("from_ward_id") REFERENCES "public"."ward"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD CONSTRAINT "ipd_bed_history_to_ward_id_ward_id_fk" FOREIGN KEY ("to_ward_id") REFERENCES "public"."ward"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD CONSTRAINT "ipd_bed_history_moved_by_staff_id_staff_id_fk" FOREIGN KEY ("moved_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD CONSTRAINT "ipd_bed_history_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD CONSTRAINT "ipd_bed_history_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ipd_bed_history" ADD CONSTRAINT "ipd_bed_history_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_master_item_unit_master" ADD CONSTRAINT "item_master_item_unit_master_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_master_item_unit_master" ADD CONSTRAINT "item_master_item_unit_master_item_master_id_item_master_id_fk" FOREIGN KEY ("item_master_id") REFERENCES "public"."item_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_master_item_unit_master" ADD CONSTRAINT "item_master_item_unit_master_item_unit_master_id_item_unit_master_id_fk" FOREIGN KEY ("item_unit_master_id") REFERENCES "public"."item_unit_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_master_item_unit_master" ADD CONSTRAINT "item_master_item_unit_master_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_master_item_unit_master" ADD CONSTRAINT "item_master_item_unit_master_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_master_item_unit_master" ADD CONSTRAINT "item_master_item_unit_master_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_master" ADD CONSTRAINT "item_master_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_master" ADD CONSTRAINT "item_master_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_master" ADD CONSTRAINT "item_master_pharmacy_generic_id_pharmacy_generic_id_fk" FOREIGN KEY ("pharmacy_generic_id") REFERENCES "public"."pharmacy_generic"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_master" ADD CONSTRAINT "item_master_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_master" ADD CONSTRAINT "item_master_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_master" ADD CONSTRAINT "item_master_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_master" ADD CONSTRAINT "item_master_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_unit_master" ADD CONSTRAINT "item_unit_master_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_unit_master" ADD CONSTRAINT "item_unit_master_purchase_unit_id_unit_id_fk" FOREIGN KEY ("purchase_unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_unit_master" ADD CONSTRAINT "item_unit_master_issue_unit_id_unit_id_fk" FOREIGN KEY ("issue_unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_unit_master" ADD CONSTRAINT "item_unit_master_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_unit_master" ADD CONSTRAINT "item_unit_master_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_unit_master" ADD CONSTRAINT "item_unit_master_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_unit_master" ADD CONSTRAINT "item_unit_master_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "module" ADD CONSTRAINT "module_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module" ADD CONSTRAINT "module_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "module" ADD CONSTRAINT "module_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "module" ADD CONSTRAINT "module_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "op_billing_line" ADD CONSTRAINT "op_billing_line_op_billing_id_op_billing_id_fk" FOREIGN KEY ("op_billing_id") REFERENCES "public"."op_billing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "op_billing_line" ADD CONSTRAINT "op_billing_line_service_order_detail_id_service_order_detail_id_fk" FOREIGN KEY ("service_order_detail_id") REFERENCES "public"."service_order_detail"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "op_billing_line" ADD CONSTRAINT "op_billing_line_service_id_service_item_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "op_billing_line" ADD CONSTRAINT "op_billing_line_sub_category_id_sub_category_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."sub_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "op_billing_line" ADD CONSTRAINT "op_billing_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "op_billing_line" ADD CONSTRAINT "op_billing_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "op_billing_line" ADD CONSTRAINT "op_billing_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_discount_type_id_billing_discount_type_id_fk" FOREIGN KEY ("discount_type_id") REFERENCES "public"."billing_discount_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_discounted_by_staff_id_staff_id_fk" FOREIGN KEY ("discounted_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_printed_by_staff_id_staff_id_fk" FOREIGN KEY ("printed_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "op_billing" ADD CONSTRAINT "op_billing_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_module_id_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_parent_id_page_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."page"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergy" ADD CONSTRAINT "patient_allergy_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergy" ADD CONSTRAINT "patient_allergy_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergy" ADD CONSTRAINT "patient_allergy_allergy_id_allergy_id_fk" FOREIGN KEY ("allergy_id") REFERENCES "public"."allergy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergy" ADD CONSTRAINT "patient_allergy_severity_id_severity_id_fk" FOREIGN KEY ("severity_id") REFERENCES "public"."severity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergy" ADD CONSTRAINT "patient_allergy_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergy" ADD CONSTRAINT "patient_allergy_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_allergy" ADD CONSTRAINT "patient_allergy_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_allergy" ADD CONSTRAINT "patient_allergy_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_attachment" ADD CONSTRAINT "patient_attachment_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_attachment" ADD CONSTRAINT "patient_attachment_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_attachment" ADD CONSTRAINT "patient_attachment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_attachment" ADD CONSTRAINT "patient_attachment_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_attachment" ADD CONSTRAINT "patient_attachment_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_height_unit_id_unit_id_fk" FOREIGN KEY ("height_unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_weight_unit_id_unit_id_fk" FOREIGN KEY ("weight_unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_bp_unit_id_unit_id_fk" FOREIGN KEY ("bp_unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_pulse_unit_id_unit_id_fk" FOREIGN KEY ("pulse_unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_temperature_unit_id_unit_id_fk" FOREIGN KEY ("temperature_unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_sp_o2_unit_id_unit_id_fk" FOREIGN KEY ("sp_o2_unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_respiration_unit_id_unit_id_fk" FOREIGN KEY ("respiration_unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_rbs_unit_id_unit_id_fk" FOREIGN KEY ("rbs_unit_id") REFERENCES "public"."unit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_diagnosis" ADD CONSTRAINT "patient_diagnosis_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_document" ADD CONSTRAINT "patient_document_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_document" ADD CONSTRAINT "patient_document_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_document" ADD CONSTRAINT "patient_document_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_document" ADD CONSTRAINT "patient_document_patient_attachment_id_patient_attachment_id_fk" FOREIGN KEY ("patient_attachment_id") REFERENCES "public"."patient_attachment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_document" ADD CONSTRAINT "patient_document_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_document" ADD CONSTRAINT "patient_document_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_document" ADD CONSTRAINT "patient_document_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_document" ADD CONSTRAINT "patient_document_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_form_entry" ADD CONSTRAINT "patient_form_entry_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_form_entry" ADD CONSTRAINT "patient_form_entry_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_form_entry" ADD CONSTRAINT "patient_form_entry_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_form_entry" ADD CONSTRAINT "patient_form_entry_form_name_id_form_name_id_fk" FOREIGN KEY ("form_name_id") REFERENCES "public"."form_name"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_form_entry" ADD CONSTRAINT "patient_form_entry_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_form_entry" ADD CONSTRAINT "patient_form_entry_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_form_entry" ADD CONSTRAINT "patient_form_entry_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_form_entry" ADD CONSTRAINT "patient_form_entry_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_insurance_id_insurance_table_id_fk" FOREIGN KEY ("insurance_id") REFERENCES "public"."insurance_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_title_id_title_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."title"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_father_title_id_title_id_fk" FOREIGN KEY ("father_title_id") REFERENCES "public"."title"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_guardian_title_id_title_id_fk" FOREIGN KEY ("guardian_title_id") REFERENCES "public"."title"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_guardian_phone_country_id_country_id_fk" FOREIGN KEY ("guardian_phone_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_phone_primary_country_id_country_id_fk" FOREIGN KEY ("phone_primary_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_phone_secondary_country_id_country_id_fk" FOREIGN KEY ("phone_secondary_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_marital_status_id_marital_status_id_fk" FOREIGN KEY ("marital_status_id") REFERENCES "public"."marital_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_gender_id_gender_id_fk" FOREIGN KEY ("gender_id") REFERENCES "public"."gender"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_identity_type_id_identity_type_id_fk" FOREIGN KEY ("identity_type_id") REFERENCES "public"."identity_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_blood_type_id_blood_type_id_fk" FOREIGN KEY ("blood_type_id") REFERENCES "public"."blood_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_postal_code_id_postal_code_id_fk" FOREIGN KEY ("postal_code_id") REFERENCES "public"."postal_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_nationality_id_nationality_id_fk" FOREIGN KEY ("nationality_id") REFERENCES "public"."nationality"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_religion_id_religion_id_fk" FOREIGN KEY ("religion_id") REFERENCES "public"."religion"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_doctor_id_staff_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_visit_type_id_visit_type_id_fk" FOREIGN KEY ("visit_type_id") REFERENCES "public"."visit_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pharmacy_generic" ADD CONSTRAINT "pharmacy_generic_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_generic" ADD CONSTRAINT "pharmacy_generic_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_generic" ADD CONSTRAINT "pharmacy_generic_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pharmacy_generic" ADD CONSTRAINT "pharmacy_generic_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "pharmacy_generic" ADD CONSTRAINT "pharmacy_generic_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "plan_of_care" ADD CONSTRAINT "plan_of_care_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_of_care" ADD CONSTRAINT "plan_of_care_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_of_care" ADD CONSTRAINT "plan_of_care_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_of_care" ADD CONSTRAINT "plan_of_care_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_of_care" ADD CONSTRAINT "plan_of_care_doctor_id_staff_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_of_care" ADD CONSTRAINT "plan_of_care_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "plan_of_care" ADD CONSTRAINT "plan_of_care_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "plan_of_care" ADD CONSTRAINT "plan_of_care_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prefix_counter" ADD CONSTRAINT "prefix_counter_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prefix_counter" ADD CONSTRAINT "prefix_counter_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prefix_counter" ADD CONSTRAINT "prefix_counter_financial_year_id_financial_year_id_fk" FOREIGN KEY ("financial_year_id") REFERENCES "public"."financial_year"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prefix_counter" ADD CONSTRAINT "prefix_counter_visit_type_id_visit_type_id_fk" FOREIGN KEY ("visit_type_id") REFERENCES "public"."visit_type"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prefix_format" ADD CONSTRAINT "prefix_format_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prefix_format" ADD CONSTRAINT "prefix_format_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prefix_format" ADD CONSTRAINT "prefix_format_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prefix_format" ADD CONSTRAINT "prefix_format_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "progress_note" ADD CONSTRAINT "progress_note_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_note" ADD CONSTRAINT "progress_note_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_note" ADD CONSTRAINT "progress_note_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_note" ADD CONSTRAINT "progress_note_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_note" ADD CONSTRAINT "progress_note_doctor_id_staff_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_note" ADD CONSTRAINT "progress_note_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "progress_note" ADD CONSTRAINT "progress_note_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "progress_note" ADD CONSTRAINT "progress_note_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "refer_history" ADD CONSTRAINT "refer_history_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refer_history" ADD CONSTRAINT "refer_history_from_branch_id_hospital_branch_id_fk" FOREIGN KEY ("from_branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refer_history" ADD CONSTRAINT "refer_history_to_branch_id_hospital_branch_id_fk" FOREIGN KEY ("to_branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refer_history" ADD CONSTRAINT "refer_history_from_refer_doctorid_staff_id_fk" FOREIGN KEY ("from_refer_doctorid") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refer_history" ADD CONSTRAINT "refer_history_to_refer_doctorid_staff_id_fk" FOREIGN KEY ("to_refer_doctorid") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refer_history" ADD CONSTRAINT "refer_history_cancel_by_user_id_fk" FOREIGN KEY ("cancel_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refer_history" ADD CONSTRAINT "refer_history_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "refer_history" ADD CONSTRAINT "refer_history_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "refer_history" ADD CONSTRAINT "refer_history_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_item" ADD CONSTRAINT "service_item_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_item" ADD CONSTRAINT "service_item_sub_category_id_sub_category_id_fk" FOREIGN KEY ("sub_category_id") REFERENCES "public"."sub_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_item" ADD CONSTRAINT "service_item_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_item" ADD CONSTRAINT "service_item_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_item" ADD CONSTRAINT "service_item_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_item" ADD CONSTRAINT "service_item_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_order_detail" ADD CONSTRAINT "service_order_detail_service_order_id_service_order_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order_detail" ADD CONSTRAINT "service_order_detail_service_id_service_item_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order_detail" ADD CONSTRAINT "service_order_detail_advising_doctor_id_staff_id_fk" FOREIGN KEY ("advising_doctor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order_detail" ADD CONSTRAINT "service_order_detail_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order_detail" ADD CONSTRAINT "service_order_detail_cancel_by_user_id_fk" FOREIGN KEY ("cancel_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order_detail" ADD CONSTRAINT "service_order_detail_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_order_detail" ADD CONSTRAINT "service_order_detail_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_order_detail" ADD CONSTRAINT "service_order_detail_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_order" ADD CONSTRAINT "service_order_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order" ADD CONSTRAINT "service_order_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order" ADD CONSTRAINT "service_order_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_order" ADD CONSTRAINT "service_order_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_order" ADD CONSTRAINT "service_order_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_order" ADD CONSTRAINT "service_order_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_tagging" ADD CONSTRAINT "service_tagging_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tagging" ADD CONSTRAINT "service_tagging_service_id_service_item_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tagging" ADD CONSTRAINT "service_tagging_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tagging" ADD CONSTRAINT "service_tagging_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_tagging" ADD CONSTRAINT "service_tagging_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "service_tagging" ADD CONSTRAINT "service_tagging_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_branch" ADD CONSTRAINT "staff_branch_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_branch" ADD CONSTRAINT "staff_branch_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_branch" ADD CONSTRAINT "staff_branch_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_branch" ADD CONSTRAINT "staff_branch_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_department" ADD CONSTRAINT "staff_department_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_department" ADD CONSTRAINT "staff_department_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_department" ADD CONSTRAINT "staff_department_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_department" ADD CONSTRAINT "staff_department_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_detail" ADD CONSTRAINT "staff_detail_blood_type_id_blood_type_id_fk" FOREIGN KEY ("blood_type_id") REFERENCES "public"."blood_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_detail" ADD CONSTRAINT "staff_detail_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_detail" ADD CONSTRAINT "staff_detail_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_detail" ADD CONSTRAINT "staff_detail_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_detail" ADD CONSTRAINT "staff_detail_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_hospital" ADD CONSTRAINT "staff_hospital_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_hospital" ADD CONSTRAINT "staff_hospital_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_hospital" ADD CONSTRAINT "staff_hospital_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_hospital" ADD CONSTRAINT "staff_hospital_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_phone_primary_country_id_country_id_fk" FOREIGN KEY ("phone_primary_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_phone_secondary_country_id_country_id_fk" FOREIGN KEY ("phone_secondary_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_identity_type_id_identity_type_id_fk" FOREIGN KEY ("identity_type_id") REFERENCES "public"."identity_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_title_id_title_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."title"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_staff_employment_type_id_staff_employment_type_id_fk" FOREIGN KEY ("staff_employment_type_id") REFERENCES "public"."staff_employment_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_staff_type_id_staff_type_id_fk" FOREIGN KEY ("staff_type_id") REFERENCES "public"."staff_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_staff_detail_id_staff_detail_id_fk" FOREIGN KEY ("staff_detail_id") REFERENCES "public"."staff_detail"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_marital_status_id_marital_status_id_fk" FOREIGN KEY ("marital_status_id") REFERENCES "public"."marital_status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_nationality_id_nationality_id_fk" FOREIGN KEY ("nationality_id") REFERENCES "public"."nationality"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_position_id_position_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_postal_code_id_postal_code_id_fk" FOREIGN KEY ("postal_code_id") REFERENCES "public"."postal_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_specialization_id_specialization_id_fk" FOREIGN KEY ("specialization_id") REFERENCES "public"."specialization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_gender_id_gender_id_fk" FOREIGN KEY ("gender_id") REFERENCES "public"."gender"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_user_group" ADD CONSTRAINT "staff_user_group_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_user_group" ADD CONSTRAINT "staff_user_group_user_group_id_user_group_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "public"."user_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_user_group" ADD CONSTRAINT "staff_user_group_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "staff_user_group" ADD CONSTRAINT "staff_user_group_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "status_tagging" ADD CONSTRAINT "status_tagging_status_tagging_type_id_status_tagging_type_id_fk" FOREIGN KEY ("status_tagging_type_id") REFERENCES "public"."status_tagging_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_tagging" ADD CONSTRAINT "status_tagging_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_tagging" ADD CONSTRAINT "status_tagging_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "status_tagging" ADD CONSTRAINT "status_tagging_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "status_tagging" ADD CONSTRAINT "status_tagging_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "status_tagging_type" ADD CONSTRAINT "status_tagging_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_tagging_type" ADD CONSTRAINT "status_tagging_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "status_tagging_type" ADD CONSTRAINT "status_tagging_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "status_tagging_type" ADD CONSTRAINT "status_tagging_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "store" ADD CONSTRAINT "store_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store" ADD CONSTRAINT "store_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store" ADD CONSTRAINT "store_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "store" ADD CONSTRAINT "store_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "store" ADD CONSTRAINT "store_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "store_user_group" ADD CONSTRAINT "store_user_group_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_user_group" ADD CONSTRAINT "store_user_group_user_group_id_user_group_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "public"."user_group"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_user_group" ADD CONSTRAINT "store_user_group_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "store_user_group" ADD CONSTRAINT "store_user_group_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sub_category" ADD CONSTRAINT "sub_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_category" ADD CONSTRAINT "sub_category_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sub_category" ADD CONSTRAINT "sub_category_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sub_category" ADD CONSTRAINT "sub_category_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sub_category" ADD CONSTRAINT "sub_category_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_phone_country_id_country_id_fk" FOREIGN KEY ("phone_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_postal_code_id_postal_code_id_fk" FOREIGN KEY ("postal_code_id") REFERENCES "public"."postal_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_assigned_to_user_id_user_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_group_page" ADD CONSTRAINT "user_group_page_user_group_id_user_group_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "public"."user_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_page" ADD CONSTRAINT "user_group_page_page_id_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_page" ADD CONSTRAINT "user_group_page_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_group_page" ADD CONSTRAINT "user_group_page_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ward" ADD CONSTRAINT "ward_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ward" ADD CONSTRAINT "ward_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ward" ADD CONSTRAINT "ward_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ward" ADD CONSTRAINT "ward_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ward" ADD CONSTRAINT "ward_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "ward" ADD CONSTRAINT "ward_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_grn_id_goods_receipt_note_id_fk" FOREIGN KEY ("grn_id") REFERENCES "public"."goods_receipt_note"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_po_line_id_purchase_order_line_id_fk" FOREIGN KEY ("po_line_id") REFERENCES "public"."purchase_order_line"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_batch_id_item_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_free_unit_id_unit_id_fk" FOREIGN KEY ("free_unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goods_receipt_line" ADD CONSTRAINT "goods_receipt_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_po_id_purchase_order_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_order"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_received_by_user_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "goods_receipt_note" ADD CONSTRAINT "goods_receipt_note_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_approval_assignee" ADD CONSTRAINT "inv_approval_assignee_level_id_inv_approval_level_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."inv_approval_level"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_approval_assignee" ADD CONSTRAINT "inv_approval_assignee_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_approval_level" ADD CONSTRAINT "inv_approval_level_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_approval_level" ADD CONSTRAINT "inv_approval_level_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_approval_level" ADD CONSTRAINT "inv_approval_level_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_approval_level" ADD CONSTRAINT "inv_approval_level_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_approval_level" ADD CONSTRAINT "inv_approval_level_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_approval_log" ADD CONSTRAINT "inv_approval_log_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_approval_log" ADD CONSTRAINT "inv_approval_log_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_consumption_line" ADD CONSTRAINT "inv_department_consumption_line_consumption_id_inv_department_consumption_id_fk" FOREIGN KEY ("consumption_id") REFERENCES "public"."inv_department_consumption"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_consumption_line" ADD CONSTRAINT "inv_department_consumption_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_consumption_line" ADD CONSTRAINT "inv_department_consumption_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_consumption_line" ADD CONSTRAINT "inv_department_consumption_line_batch_id_item_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_consumption_line" ADD CONSTRAINT "inv_department_consumption_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_consumption_line" ADD CONSTRAINT "inv_department_consumption_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_consumption_line" ADD CONSTRAINT "inv_department_consumption_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_consumption" ADD CONSTRAINT "inv_department_consumption_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_consumption" ADD CONSTRAINT "inv_department_consumption_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_consumption" ADD CONSTRAINT "inv_department_consumption_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_consumption" ADD CONSTRAINT "inv_department_consumption_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_consumption" ADD CONSTRAINT "inv_department_consumption_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_consumption" ADD CONSTRAINT "inv_department_consumption_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_consumption" ADD CONSTRAINT "inv_department_consumption_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_consumption" ADD CONSTRAINT "inv_department_consumption_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_consumption" ADD CONSTRAINT "inv_department_consumption_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_indent_line_alloc" ADD CONSTRAINT "inv_department_indent_line_alloc_line_id_inv_department_indent_line_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."inv_department_indent_line"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent_line_alloc" ADD CONSTRAINT "inv_department_indent_line_alloc_batch_id_item_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent_line" ADD CONSTRAINT "inv_department_indent_line_indent_id_inv_department_indent_id_fk" FOREIGN KEY ("indent_id") REFERENCES "public"."inv_department_indent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent_line" ADD CONSTRAINT "inv_department_indent_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent_line" ADD CONSTRAINT "inv_department_indent_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent_line" ADD CONSTRAINT "inv_department_indent_line_batch_id_item_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent_line" ADD CONSTRAINT "inv_department_indent_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_indent_line" ADD CONSTRAINT "inv_department_indent_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_indent_line" ADD CONSTRAINT "inv_department_indent_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD CONSTRAINT "inv_department_indent_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD CONSTRAINT "inv_department_indent_from_store_id_store_id_fk" FOREIGN KEY ("from_store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD CONSTRAINT "inv_department_indent_to_store_id_store_id_fk" FOREIGN KEY ("to_store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD CONSTRAINT "inv_department_indent_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD CONSTRAINT "inv_department_indent_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD CONSTRAINT "inv_department_indent_from_approved_by_user_id_fk" FOREIGN KEY ("from_approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD CONSTRAINT "inv_department_indent_issued_by_user_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD CONSTRAINT "inv_department_indent_received_by_user_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD CONSTRAINT "inv_department_indent_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD CONSTRAINT "inv_department_indent_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD CONSTRAINT "inv_department_indent_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_indent" ADD CONSTRAINT "inv_department_indent_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_issue_line_alloc" ADD CONSTRAINT "inv_department_issue_line_alloc_line_id_inv_department_issue_line_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."inv_department_issue_line"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue_line_alloc" ADD CONSTRAINT "inv_department_issue_line_alloc_batch_id_item_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue_line" ADD CONSTRAINT "inv_department_issue_line_issue_id_inv_department_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."inv_department_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue_line" ADD CONSTRAINT "inv_department_issue_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue_line" ADD CONSTRAINT "inv_department_issue_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue_line" ADD CONSTRAINT "inv_department_issue_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_issue_line" ADD CONSTRAINT "inv_department_issue_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_issue_line" ADD CONSTRAINT "inv_department_issue_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_source_indent_id_inv_department_indent_id_fk" FOREIGN KEY ("source_indent_id") REFERENCES "public"."inv_department_indent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_from_store_id_store_id_fk" FOREIGN KEY ("from_store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_to_store_id_store_id_fk" FOREIGN KEY ("to_store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_issued_by_user_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_received_by_user_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_department_issue" ADD CONSTRAINT "inv_department_issue_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_item_reorder_level" ADD CONSTRAINT "inv_item_reorder_level_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_item_reorder_level" ADD CONSTRAINT "inv_item_reorder_level_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_item_reorder_level" ADD CONSTRAINT "inv_item_reorder_level_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_item_reorder_level" ADD CONSTRAINT "inv_item_reorder_level_item_unit_master_id_item_unit_master_id_fk" FOREIGN KEY ("item_unit_master_id") REFERENCES "public"."item_unit_master"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_item_reorder_level" ADD CONSTRAINT "inv_item_reorder_level_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_item_reorder_level" ADD CONSTRAINT "inv_item_reorder_level_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_item_reorder_level" ADD CONSTRAINT "inv_item_reorder_level_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_module_pricing_assignment" ADD CONSTRAINT "inv_module_pricing_assignment_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_module_pricing_assignment" ADD CONSTRAINT "inv_module_pricing_assignment_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_module_pricing_assignment" ADD CONSTRAINT "inv_module_pricing_assignment_formula_template_id_inv_pricing_formula_template_id_fk" FOREIGN KEY ("formula_template_id") REFERENCES "public"."inv_pricing_formula_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_pricing_formula_template" ADD CONSTRAINT "inv_pricing_formula_template_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_pricing_formula_template" ADD CONSTRAINT "inv_pricing_formula_template_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_alert_email_sent" ADD CONSTRAINT "inv_stock_alert_email_sent_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_alert_email_sent" ADD CONSTRAINT "inv_stock_alert_email_sent_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_alert_email_sent" ADD CONSTRAINT "inv_stock_alert_email_sent_recipient_staff_id_staff_id_fk" FOREIGN KEY ("recipient_staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_alert_recipient" ADD CONSTRAINT "inv_stock_alert_recipient_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_alert_recipient" ADD CONSTRAINT "inv_stock_alert_recipient_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_alert_recipient" ADD CONSTRAINT "inv_stock_alert_recipient_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_alert_recipient" ADD CONSTRAINT "inv_stock_alert_recipient_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_stock_alert_recipient" ADD CONSTRAINT "inv_stock_alert_recipient_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_stock_alert_recipient" ADD CONSTRAINT "inv_stock_alert_recipient_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_stock_alert_setting" ADD CONSTRAINT "inv_stock_alert_setting_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_issue_line" ADD CONSTRAINT "inv_stock_issue_line_issue_id_inv_stock_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."inv_stock_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_issue_line" ADD CONSTRAINT "inv_stock_issue_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_issue_line" ADD CONSTRAINT "inv_stock_issue_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_issue_line" ADD CONSTRAINT "inv_stock_issue_line_batch_id_item_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_issue_line" ADD CONSTRAINT "inv_stock_issue_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_stock_issue_line" ADD CONSTRAINT "inv_stock_issue_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_stock_issue_line" ADD CONSTRAINT "inv_stock_issue_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_stock_issue" ADD CONSTRAINT "inv_stock_issue_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_issue" ADD CONSTRAINT "inv_stock_issue_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_issue" ADD CONSTRAINT "inv_stock_issue_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_issue" ADD CONSTRAINT "inv_stock_issue_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_issue" ADD CONSTRAINT "inv_stock_issue_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock_issue" ADD CONSTRAINT "inv_stock_issue_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_stock_issue" ADD CONSTRAINT "inv_stock_issue_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_stock_issue" ADD CONSTRAINT "inv_stock_issue_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_stock" ADD CONSTRAINT "inv_stock_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock" ADD CONSTRAINT "inv_stock_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock" ADD CONSTRAINT "inv_stock_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock" ADD CONSTRAINT "inv_stock_batch_id_item_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_stock" ADD CONSTRAINT "inv_stock_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_stock" ADD CONSTRAINT "inv_stock_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_stock" ADD CONSTRAINT "inv_stock_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_store_transfer_line" ADD CONSTRAINT "inv_store_transfer_line_transfer_id_inv_store_transfer_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."inv_store_transfer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_store_transfer_line" ADD CONSTRAINT "inv_store_transfer_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_store_transfer_line" ADD CONSTRAINT "inv_store_transfer_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_store_transfer_line" ADD CONSTRAINT "inv_store_transfer_line_batch_id_item_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_store_transfer_line" ADD CONSTRAINT "inv_store_transfer_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_store_transfer_line" ADD CONSTRAINT "inv_store_transfer_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_store_transfer_line" ADD CONSTRAINT "inv_store_transfer_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_store_transfer" ADD CONSTRAINT "inv_store_transfer_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_store_transfer" ADD CONSTRAINT "inv_store_transfer_from_store_id_store_id_fk" FOREIGN KEY ("from_store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_store_transfer" ADD CONSTRAINT "inv_store_transfer_to_store_id_store_id_fk" FOREIGN KEY ("to_store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_store_transfer" ADD CONSTRAINT "inv_store_transfer_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_store_transfer" ADD CONSTRAINT "inv_store_transfer_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_store_transfer" ADD CONSTRAINT "inv_store_transfer_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_store_transfer" ADD CONSTRAINT "inv_store_transfer_source_grn_id_goods_receipt_note_id_fk" FOREIGN KEY ("source_grn_id") REFERENCES "public"."goods_receipt_note"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_store_transfer" ADD CONSTRAINT "inv_store_transfer_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inv_store_transfer" ADD CONSTRAINT "inv_store_transfer_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_store_transfer" ADD CONSTRAINT "inv_store_transfer_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inv_store_transfer" ADD CONSTRAINT "inv_store_transfer_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "item_batch" ADD CONSTRAINT "item_batch_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_batch" ADD CONSTRAINT "item_batch_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_batch" ADD CONSTRAINT "item_batch_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_batch" ADD CONSTRAINT "item_batch_goods_receipt_note_id_goods_receipt_note_id_fk" FOREIGN KEY ("goods_receipt_note_id") REFERENCES "public"."goods_receipt_note"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_batch" ADD CONSTRAINT "item_batch_goods_receipt_line_id_goods_receipt_line_id_fk" FOREIGN KEY ("goods_receipt_line_id") REFERENCES "public"."goods_receipt_line"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_po_id_purchase_order_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_pr_line_id_purchase_requisition_line_id_fk" FOREIGN KEY ("pr_line_id") REFERENCES "public"."purchase_requisition_line"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase_order_line" ADD CONSTRAINT "purchase_order_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_pr_id_purchase_requisition_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisition"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_supplier_id_supplier_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase_requisition_line" ADD CONSTRAINT "purchase_requisition_line_pr_id_purchase_requisition_id_fk" FOREIGN KEY ("pr_id") REFERENCES "public"."purchase_requisition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition_line" ADD CONSTRAINT "purchase_requisition_line_item_id_item_master_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition_line" ADD CONSTRAINT "purchase_requisition_line_unit_id_unit_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition_line" ADD CONSTRAINT "purchase_requisition_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase_requisition_line" ADD CONSTRAINT "purchase_requisition_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase_requisition_line" ADD CONSTRAINT "purchase_requisition_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_from_store_id_store_id_fk" FOREIGN KEY ("from_store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_to_store_id_store_id_fk" FOREIGN KEY ("to_store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_cancelled_by_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "purchase_requisition" ADD CONSTRAINT "purchase_requisition_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_dose_unit_inactive" ADD CONSTRAINT "med_order_dose_unit_inactive_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_dose_unit_inactive" ADD CONSTRAINT "med_order_dose_unit_inactive_dose_unit_id_med_order_dose_unit_id_fk" FOREIGN KEY ("dose_unit_id") REFERENCES "public"."med_order_dose_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_dose_unit_inactive" ADD CONSTRAINT "med_order_dose_unit_inactive_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_dose_unit" ADD CONSTRAINT "med_order_dose_unit_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_dose_unit" ADD CONSTRAINT "med_order_dose_unit_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_dose_unit" ADD CONSTRAINT "med_order_dose_unit_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_dose_unit" ADD CONSTRAINT "med_order_dose_unit_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_duration_unit_inactive" ADD CONSTRAINT "med_order_duration_unit_inactive_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_duration_unit_inactive" ADD CONSTRAINT "med_order_duration_unit_inactive_duration_unit_id_med_order_duration_unit_id_fk" FOREIGN KEY ("duration_unit_id") REFERENCES "public"."med_order_duration_unit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_duration_unit_inactive" ADD CONSTRAINT "med_order_duration_unit_inactive_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_duration_unit" ADD CONSTRAINT "med_order_duration_unit_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_duration_unit" ADD CONSTRAINT "med_order_duration_unit_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_duration_unit" ADD CONSTRAINT "med_order_duration_unit_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_duration_unit" ADD CONSTRAINT "med_order_duration_unit_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_food_relation_inactive" ADD CONSTRAINT "med_order_food_relation_inactive_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_food_relation_inactive" ADD CONSTRAINT "med_order_food_relation_inactive_food_relation_id_med_order_food_relation_id_fk" FOREIGN KEY ("food_relation_id") REFERENCES "public"."med_order_food_relation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_food_relation_inactive" ADD CONSTRAINT "med_order_food_relation_inactive_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_food_relation" ADD CONSTRAINT "med_order_food_relation_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_food_relation" ADD CONSTRAINT "med_order_food_relation_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_food_relation" ADD CONSTRAINT "med_order_food_relation_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_food_relation" ADD CONSTRAINT "med_order_food_relation_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_form_inactive" ADD CONSTRAINT "med_order_form_inactive_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_form_inactive" ADD CONSTRAINT "med_order_form_inactive_form_id_med_order_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."med_order_form"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_form_inactive" ADD CONSTRAINT "med_order_form_inactive_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_form" ADD CONSTRAINT "med_order_form_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_form" ADD CONSTRAINT "med_order_form_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_form" ADD CONSTRAINT "med_order_form_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_form" ADD CONSTRAINT "med_order_form_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_frequency_inactive" ADD CONSTRAINT "med_order_frequency_inactive_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_frequency_inactive" ADD CONSTRAINT "med_order_frequency_inactive_frequency_id_med_order_frequency_id_fk" FOREIGN KEY ("frequency_id") REFERENCES "public"."med_order_frequency"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_frequency_inactive" ADD CONSTRAINT "med_order_frequency_inactive_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_frequency" ADD CONSTRAINT "med_order_frequency_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_frequency" ADD CONSTRAINT "med_order_frequency_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_frequency" ADD CONSTRAINT "med_order_frequency_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_frequency" ADD CONSTRAINT "med_order_frequency_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_order_type_inactive" ADD CONSTRAINT "med_order_order_type_inactive_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_order_type_inactive" ADD CONSTRAINT "med_order_order_type_inactive_order_type_id_med_order_order_type_id_fk" FOREIGN KEY ("order_type_id") REFERENCES "public"."med_order_order_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_order_type_inactive" ADD CONSTRAINT "med_order_order_type_inactive_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_order_type" ADD CONSTRAINT "med_order_order_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_order_type" ADD CONSTRAINT "med_order_order_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_order_type" ADD CONSTRAINT "med_order_order_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_order_type" ADD CONSTRAINT "med_order_order_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_route_inactive" ADD CONSTRAINT "med_order_route_inactive_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_route_inactive" ADD CONSTRAINT "med_order_route_inactive_route_id_med_order_route_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."med_order_route"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_route_inactive" ADD CONSTRAINT "med_order_route_inactive_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_route" ADD CONSTRAINT "med_order_route_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "med_order_route" ADD CONSTRAINT "med_order_route_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_route" ADD CONSTRAINT "med_order_route_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "med_order_route" ADD CONSTRAINT "med_order_route_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_order_batch_payment" ADD CONSTRAINT "medication_order_batch_payment_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_batch_payment" ADD CONSTRAINT "medication_order_batch_payment_batch_id_medication_order_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."medication_order_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_batch_payment" ADD CONSTRAINT "medication_order_batch_payment_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_order_batch_payment" ADD CONSTRAINT "medication_order_batch_payment_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_order_batch_payment" ADD CONSTRAINT "medication_order_batch_payment_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_order_batch" ADD CONSTRAINT "medication_order_batch_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_batch" ADD CONSTRAINT "medication_order_batch_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_batch" ADD CONSTRAINT "medication_order_batch_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_batch" ADD CONSTRAINT "medication_order_batch_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_order_batch" ADD CONSTRAINT "medication_order_batch_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_order_batch" ADD CONSTRAINT "medication_order_batch_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_order_line_allocation" ADD CONSTRAINT "medication_order_line_allocation_line_id_medication_order_line_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."medication_order_line"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line_allocation" ADD CONSTRAINT "medication_order_line_allocation_batch_id_item_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."item_batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line_allocation" ADD CONSTRAINT "medication_order_line_allocation_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_order_line_allocation" ADD CONSTRAINT "medication_order_line_allocation_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_order_line_allocation" ADD CONSTRAINT "medication_order_line_allocation_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_batch_id_medication_order_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."medication_order_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_item_master_id_item_master_id_fk" FOREIGN KEY ("item_master_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_dose_unit_id_med_order_dose_unit_id_fk" FOREIGN KEY ("dose_unit_id") REFERENCES "public"."med_order_dose_unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_frequency_id_med_order_frequency_id_fk" FOREIGN KEY ("frequency_id") REFERENCES "public"."med_order_frequency"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_duration_unit_id_med_order_duration_unit_id_fk" FOREIGN KEY ("duration_unit_id") REFERENCES "public"."med_order_duration_unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_form_id_med_order_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."med_order_form"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_route_id_med_order_route_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."med_order_route"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_order_type_id_med_order_order_type_id_fk" FOREIGN KEY ("order_type_id") REFERENCES "public"."med_order_order_type"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_food_relation_id_med_order_food_relation_id_fk" FOREIGN KEY ("food_relation_id") REFERENCES "public"."med_order_food_relation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_item_unit_master_id_item_unit_master_id_fk" FOREIGN KEY ("item_unit_master_id") REFERENCES "public"."item_unit_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_out_unit_id_unit_id_fk" FOREIGN KEY ("out_unit_id") REFERENCES "public"."unit"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "medication_order_line" ADD CONSTRAINT "medication_order_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_staff_id_staff_id_fk" FOREIGN KEY ("recipient_staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_refer_history_id_refer_history_id_fk" FOREIGN KEY ("refer_history_id") REFERENCES "public"."refer_history"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "marketplace_allowed_file_extension" ADD CONSTRAINT "marketplace_allowed_file_extension_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_app_archive" ADD CONSTRAINT "marketplace_app_archive_app_id_marketplace_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."marketplace_app"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_app_archive" ADD CONSTRAINT "marketplace_app_archive_file_extension_id_marketplace_allowed_file_extension_id_fk" FOREIGN KEY ("file_extension_id") REFERENCES "public"."marketplace_allowed_file_extension"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_app_archive" ADD CONSTRAINT "marketplace_app_archive_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_app_form" ADD CONSTRAINT "marketplace_app_form_app_id_marketplace_app_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."marketplace_app"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_app_form" ADD CONSTRAINT "marketplace_app_form_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_app" ADD CONSTRAINT "marketplace_app_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_discount_type_code_idx" ON "billing_discount_type" USING btree ("code");--> statement-breakpoint
CREATE INDEX "billing_discount_type_name_idx" ON "billing_discount_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "billing_discount_type_status_id_idx" ON "billing_discount_type" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "blood_type_name_idx" ON "blood_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "blood_type_status_id_idx" ON "blood_type" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "category_name_idx" ON "category" USING btree ("category_name");--> statement-breakpoint
CREATE INDEX "category_status_id_idx" ON "category" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "city_name_idx" ON "city" USING btree ("name");--> statement-breakpoint
CREATE INDEX "city_code_idx" ON "city" USING btree ("code");--> statement-breakpoint
CREATE INDEX "city_state_id_idx" ON "city" USING btree ("state_id");--> statement-breakpoint
CREATE INDEX "city_status_id_idx" ON "city" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "country_name_idx" ON "country" USING btree ("name");--> statement-breakpoint
CREATE INDEX "country_code_idx" ON "country" USING btree ("code");--> statement-breakpoint
CREATE INDEX "country_calling_code_idx" ON "country" USING btree ("country_calling_code");--> statement-breakpoint
CREATE INDEX "country_status_id_idx" ON "country" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "craft_group_name_idx" ON "craft_group" USING btree ("name");--> statement-breakpoint
CREATE INDEX "craft_group_status_id_idx" ON "craft_group" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "department_name_idx" ON "department" USING btree ("name");--> statement-breakpoint
CREATE INDEX "department_code_idx" ON "department" USING btree ("code");--> statement-breakpoint
CREATE INDEX "department_status_id_idx" ON "department" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "diagnosis_type_name_idx" ON "diagnosis_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "diagnosis_type_status_id_idx" ON "diagnosis_type" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "form_name_code_idx" ON "form_name" USING btree ("code");--> statement-breakpoint
CREATE INDEX "form_name_name_idx" ON "form_name" USING btree ("name");--> statement-breakpoint
CREATE INDEX "form_name_form_type_idx" ON "form_name" USING btree ("form_type");--> statement-breakpoint
CREATE INDEX "form_name_status_id_idx" ON "form_name" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "gender_name_idx" ON "gender" USING btree ("name");--> statement-breakpoint
CREATE INDEX "gender_status_id_idx" ON "gender" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "identity_type_name_idx" ON "identity_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "identity_type_status_id_idx" ON "identity_type" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "marital_status_name_idx" ON "marital_status" USING btree ("name");--> statement-breakpoint
CREATE INDEX "marital_status_status_id_idx" ON "marital_status" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "nationality_name_idx" ON "nationality" USING btree ("name");--> statement-breakpoint
CREATE INDEX "nationality_status_id_idx" ON "nationality" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "position_name_idx" ON "position" USING btree ("name");--> statement-breakpoint
CREATE INDEX "position_status_id_idx" ON "position" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "postal_code_value_idx" ON "postal_code" USING btree ("value");--> statement-breakpoint
CREATE INDEX "postal_code_city_id_idx" ON "postal_code" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "postal_code_status_id_idx" ON "postal_code" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "refer_type_name_idx" ON "refer_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "refer_type_status_id_idx" ON "refer_type" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "religion_name_idx" ON "religion" USING btree ("name");--> statement-breakpoint
CREATE INDEX "religion_status_id_idx" ON "religion" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "severity_name_idx" ON "severity" USING btree ("name");--> statement-breakpoint
CREATE INDEX "severity_status_id_idx" ON "severity" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "specialization_name_idx" ON "specialization" USING btree ("name");--> statement-breakpoint
CREATE INDEX "specialization_craft_group_id_idx" ON "specialization" USING btree ("craft_group_id");--> statement-breakpoint
CREATE INDEX "specialization_status_id_idx" ON "specialization" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "staff_employment_type_name_idx" ON "staff_employment_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "staff_employment_type_code_idx" ON "staff_employment_type" USING btree ("code");--> statement-breakpoint
CREATE INDEX "staff_employment_type_status_id_idx" ON "staff_employment_type" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "staff_shift_type_name_idx" ON "staff_shift_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "staff_shift_type_code_idx" ON "staff_shift_type" USING btree ("code");--> statement-breakpoint
CREATE INDEX "staff_shift_type_status_id_idx" ON "staff_shift_type" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "staff_type_name_idx" ON "staff_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "staff_type_code_idx" ON "staff_type" USING btree ("code");--> statement-breakpoint
CREATE INDEX "staff_type_status_id_idx" ON "staff_type" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "state_name_idx" ON "state" USING btree ("name");--> statement-breakpoint
CREATE INDEX "state_code_idx" ON "state" USING btree ("code");--> statement-breakpoint
CREATE INDEX "state_country_id_idx" ON "state" USING btree ("country_id");--> statement-breakpoint
CREATE INDEX "state_status_id_idx" ON "state" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "status_name_idx" ON "status" USING btree ("name");--> statement-breakpoint
CREATE INDEX "title_name_idx" ON "title" USING btree ("name");--> statement-breakpoint
CREATE INDEX "title_status_id_idx" ON "title" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "unit_name_idx" ON "unit" USING btree ("name");--> statement-breakpoint
CREATE INDEX "unit_unit_type_id_idx" ON "unit" USING btree ("unit_type_id");--> statement-breakpoint
CREATE INDEX "unit_status_id_idx" ON "unit" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "unit_type_name_idx" ON "unit_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "unit_type_status_id_idx" ON "unit_type" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "visit_type_name_idx" ON "visit_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "visit_type_code_idx" ON "visit_type" USING btree ("code");--> statement-breakpoint
CREATE INDEX "visit_type_status_id_idx" ON "visit_type" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "weekday_name_idx" ON "weekday" USING btree ("name");--> statement-breakpoint
CREATE INDEX "weekday_status_id_idx" ON "weekday" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "bed_ward_id_idx" ON "bed" USING btree ("ward_id");--> statement-breakpoint
CREATE INDEX "bed_hospital_id_idx" ON "bed" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "bed_bed_status_idx" ON "bed" USING btree ("bed_status");--> statement-breakpoint
CREATE INDEX "bed_status_id_idx" ON "bed" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "cpoe_prescription_note_visit_id_idx" ON "cpoe_prescription_note" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "cpoe_prescription_note_patient_id_idx" ON "cpoe_prescription_note" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "cpoe_prescription_note_branch_id_idx" ON "cpoe_prescription_note" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "cpoe_prescription_note_status_id_idx" ON "cpoe_prescription_note" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "diagnosis_branch_id_idx" ON "diagnosis" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "diagnosis_patient_id_idx" ON "diagnosis" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "diagnosis_visit_id_idx" ON "diagnosis" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "diagnosis_diagnosis_type_id_idx" ON "diagnosis" USING btree ("diagnosis_type_id");--> statement-breakpoint
CREATE INDEX "document_setting_name_idx" ON "document_setting" USING btree ("name");--> statement-breakpoint
CREATE INDEX "document_setting_document_type_id_idx" ON "document_setting" USING btree ("document_type_id");--> statement-breakpoint
CREATE INDEX "document_setting_hospital_id_idx" ON "document_setting" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "document_setting_status_id_idx" ON "document_setting" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "document_code_idx" ON "document" USING btree ("code");--> statement-breakpoint
CREATE INDEX "document_document_type_id_idx" ON "document" USING btree ("document_type_id");--> statement-breakpoint
CREATE INDEX "document_status_id_idx" ON "document" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "document_type_name_idx" ON "document_type" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "document_type_status_id_idx" ON "document_type" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "ip_billing_line_ip_billing_id_idx" ON "ip_billing_line" USING btree ("ip_billing_id");--> statement-breakpoint
CREATE INDEX "ip_billing_line_service_id_idx" ON "ip_billing_line" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "ip_billing_line_service_order_detail_id_idx" ON "ip_billing_line" USING btree ("service_order_detail_id");--> statement-breakpoint
CREATE INDEX "ip_billing_visit_id_idx" ON "ip_billing" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "ip_billing_admission_id_idx" ON "ip_billing" USING btree ("admission_id");--> statement-breakpoint
CREATE INDEX "ip_billing_hospital_id_idx" ON "ip_billing" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "ip_billing_branch_id_idx" ON "ip_billing" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "ip_billing_bill_no_idx" ON "ip_billing" USING btree ("bill_no");--> statement-breakpoint
CREATE INDEX "ip_billing_status_id_idx" ON "ip_billing" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "ipd_admission_visit_id_idx" ON "ipd_admission" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "ipd_admission_hospital_id_idx" ON "ipd_admission" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "ipd_admission_ward_id_idx" ON "ipd_admission" USING btree ("ward_id");--> statement-breakpoint
CREATE INDEX "ipd_admission_bed_id_idx" ON "ipd_admission" USING btree ("bed_id");--> statement-breakpoint
CREATE INDEX "ipd_admission_admission_status_idx" ON "ipd_admission" USING btree ("admission_status");--> statement-breakpoint
CREATE UNIQUE INDEX "ipd_admission_visit_active_uidx" ON "ipd_admission" USING btree ("visit_id") WHERE "ipd_admission"."admission_status" = 1;--> statement-breakpoint
CREATE INDEX "ipd_bed_history_admission_id_idx" ON "ipd_bed_history" USING btree ("admission_id");--> statement-breakpoint
CREATE INDEX "ipd_bed_history_to_bed_id_idx" ON "ipd_bed_history" USING btree ("to_bed_id");--> statement-breakpoint
CREATE INDEX "im_ium_hospital_id_idx" ON "item_master_item_unit_master" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "im_ium_item_master_id_idx" ON "item_master_item_unit_master" USING btree ("item_master_id");--> statement-breakpoint
CREATE INDEX "im_ium_item_unit_master_id_idx" ON "item_master_item_unit_master" USING btree ("item_unit_master_id");--> statement-breakpoint
CREATE UNIQUE INDEX "im_ium_hospital_item_unit_unique" ON "item_master_item_unit_master" USING btree ("hospital_id","item_master_id","item_unit_master_id") WHERE "item_master_item_unit_master"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "im_ium_one_default_per_item_unique" ON "item_master_item_unit_master" USING btree ("hospital_id","item_master_id") WHERE "item_master_item_unit_master"."deleted_at" IS NULL AND "item_master_item_unit_master"."is_default_yes_no" = 1;--> statement-breakpoint
CREATE INDEX "item_master_hospital_id_idx" ON "item_master" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "item_master_category_id_idx" ON "item_master" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "item_master_item_name_idx" ON "item_master" USING btree ("item_name");--> statement-breakpoint
CREATE INDEX "item_master_status_id_idx" ON "item_master" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "item_unit_master_hospital_id_idx" ON "item_unit_master" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "item_unit_master_status_id_idx" ON "item_unit_master" USING btree ("status_id");--> statement-breakpoint
CREATE UNIQUE INDEX "item_unit_master_hospital_units_unique" ON "item_unit_master" USING btree ("hospital_id","purchase_unit_id","issue_unit_id") WHERE "item_unit_master"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "op_billing_line_op_billing_id_idx" ON "op_billing_line" USING btree ("op_billing_id");--> statement-breakpoint
CREATE INDEX "op_billing_line_service_id_idx" ON "op_billing_line" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "op_billing_line_service_order_detail_id_idx" ON "op_billing_line" USING btree ("service_order_detail_id");--> statement-breakpoint
CREATE INDEX "op_billing_line_medication_order_line_id_idx" ON "op_billing_line" USING btree ("medication_order_line_id");--> statement-breakpoint
CREATE INDEX "op_billing_visit_id_idx" ON "op_billing" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "op_billing_hospital_id_idx" ON "op_billing" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "op_billing_branch_id_idx" ON "op_billing" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "op_billing_bill_no_idx" ON "op_billing" USING btree ("bill_no");--> statement-breakpoint
CREATE INDEX "op_billing_status_id_idx" ON "op_billing" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "op_billing_discount_type_id_idx" ON "op_billing" USING btree ("discount_type_id");--> statement-breakpoint
CREATE INDEX "patient_document_visit_id_idx" ON "patient_document" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "patient_document_patient_id_idx" ON "patient_document" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_document_document_id_idx" ON "patient_document" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "patient_document_status_id_idx" ON "patient_document" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "patient_document_patient_attachment_id_idx" ON "patient_document" USING btree ("patient_attachment_id");--> statement-breakpoint
CREATE INDEX "patient_form_entry_branch_id_idx" ON "patient_form_entry" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "patient_form_entry_patient_id_idx" ON "patient_form_entry" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_form_entry_visit_id_idx" ON "patient_form_entry" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "patient_form_entry_form_name_id_idx" ON "patient_form_entry" USING btree ("form_name_id");--> statement-breakpoint
CREATE INDEX "patient_form_entry_status_id_idx" ON "patient_form_entry" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "pharmacy_generic_hospital_id_idx" ON "pharmacy_generic" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "pharmacy_generic_name_idx" ON "pharmacy_generic" USING btree ("name");--> statement-breakpoint
CREATE INDEX "pharmacy_generic_status_id_idx" ON "pharmacy_generic" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "plan_of_care_visit_id_idx" ON "plan_of_care" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "plan_of_care_patient_id_idx" ON "plan_of_care" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "plan_of_care_branch_id_idx" ON "plan_of_care" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "plan_of_care_status_id_idx" ON "plan_of_care" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "progress_note_visit_id_idx" ON "progress_note" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "progress_note_patient_id_idx" ON "progress_note" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "progress_note_branch_id_idx" ON "progress_note" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "progress_note_status_id_idx" ON "progress_note" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "supplier_hospital_id_idx" ON "supplier" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "supplier_name_idx" ON "supplier" USING btree ("name");--> statement-breakpoint
CREATE INDEX "supplier_status_id_idx" ON "supplier" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "ward_hospital_id_idx" ON "ward" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "ward_branch_id_idx" ON "ward" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "ward_status_id_idx" ON "ward" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "goods_receipt_line_grn_id_idx" ON "goods_receipt_line" USING btree ("grn_id");--> statement-breakpoint
CREATE INDEX "goods_receipt_note_po_id_idx" ON "goods_receipt_note" USING btree ("po_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inv_approval_assignee_level_staff_uidx" ON "inv_approval_assignee" USING btree ("level_id","staff_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inv_approval_level_store_module_level_active_uidx" ON "inv_approval_level" USING btree ("hospital_id","store_id","module","level") WHERE "inv_approval_level"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "inv_approval_level_hospital_store_idx" ON "inv_approval_level" USING btree ("hospital_id","store_id");--> statement-breakpoint
CREATE INDEX "inv_approval_log_document_idx" ON "inv_approval_log" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "inv_department_consumption_line_consumption_id_idx" ON "inv_department_consumption_line" USING btree ("consumption_id");--> statement-breakpoint
CREATE INDEX "inv_department_consumption_hospital_store_idx" ON "inv_department_consumption" USING btree ("hospital_id","store_id");--> statement-breakpoint
CREATE INDEX "inv_department_consumption_status_idx" ON "inv_department_consumption" USING btree ("status_tagging_id");--> statement-breakpoint
CREATE INDEX "inv_department_indent_line_alloc_line_idx" ON "inv_department_indent_line_alloc" USING btree ("line_id");--> statement-breakpoint
CREATE INDEX "inv_department_indent_line_indent_id_idx" ON "inv_department_indent_line" USING btree ("indent_id");--> statement-breakpoint
CREATE INDEX "inv_department_indent_hospital_from_idx" ON "inv_department_indent" USING btree ("hospital_id","from_store_id");--> statement-breakpoint
CREATE INDEX "inv_department_indent_hospital_to_idx" ON "inv_department_indent" USING btree ("hospital_id","to_store_id");--> statement-breakpoint
CREATE INDEX "inv_department_issue_line_alloc_line_idx" ON "inv_department_issue_line_alloc" USING btree ("line_id");--> statement-breakpoint
CREATE INDEX "inv_department_issue_line_issue_id_idx" ON "inv_department_issue_line" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "inv_department_issue_hospital_from_idx" ON "inv_department_issue" USING btree ("hospital_id","from_store_id");--> statement-breakpoint
CREATE INDEX "inv_department_issue_hospital_to_idx" ON "inv_department_issue" USING btree ("hospital_id","to_store_id");--> statement-breakpoint
CREATE INDEX "inv_department_issue_status_idx" ON "inv_department_issue" USING btree ("status_tagging_id");--> statement-breakpoint
CREATE INDEX "inv_department_issue_source_indent_idx" ON "inv_department_issue" USING btree ("source_indent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inv_item_reorder_level_store_item_active_uidx" ON "inv_item_reorder_level" USING btree ("hospital_id","store_id","item_id") WHERE "inv_item_reorder_level"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "inv_item_reorder_level_store_idx" ON "inv_item_reorder_level" USING btree ("hospital_id","store_id");--> statement-breakpoint
CREATE INDEX "inv_item_reorder_level_item_idx" ON "inv_item_reorder_level" USING btree ("hospital_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inv_module_pricing_assignment_scope_uidx" ON "inv_module_pricing_assignment" USING btree ("hospital_id","branch_id","module");--> statement-breakpoint
CREATE INDEX "inv_module_pricing_assignment_hospital_idx" ON "inv_module_pricing_assignment" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "inv_module_pricing_assignment_template_idx" ON "inv_module_pricing_assignment" USING btree ("formula_template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inv_pricing_formula_template_hospital_name_uidx" ON "inv_pricing_formula_template" USING btree ("hospital_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "inv_pricing_formula_template_hospital_default_uidx" ON "inv_pricing_formula_template" USING btree ("hospital_id") WHERE "inv_pricing_formula_template"."is_system_default" = true;--> statement-breakpoint
CREATE INDEX "inv_pricing_formula_template_hospital_idx" ON "inv_pricing_formula_template" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "inv_stock_alert_email_sent_lookup_idx" ON "inv_stock_alert_email_sent" USING btree ("hospital_id","recipient_staff_id","store_id","event_type","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inv_stock_alert_recipient_hospital_store_staff_uidx" ON "inv_stock_alert_recipient" USING btree ("hospital_id","store_id","staff_id") WHERE "inv_stock_alert_recipient"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "inv_stock_alert_recipient_hospital_idx" ON "inv_stock_alert_recipient" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "inv_stock_alert_recipient_store_idx" ON "inv_stock_alert_recipient" USING btree ("hospital_id","store_id");--> statement-breakpoint
CREATE INDEX "inv_stock_alert_setting_hospital_idx" ON "inv_stock_alert_setting" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "inv_stock_issue_line_issue_id_idx" ON "inv_stock_issue_line" USING btree ("issue_id");--> statement-breakpoint
CREATE INDEX "inv_stock_issue_store_idx" ON "inv_stock_issue" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "inv_stock_store_item_idx" ON "inv_stock" USING btree ("store_id","item_id");--> statement-breakpoint
CREATE INDEX "inv_stock_batch_idx" ON "inv_stock" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "inv_store_transfer_line_transfer_id_idx" ON "inv_store_transfer_line" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "item_batch_hospital_item_idx" ON "item_batch" USING btree ("hospital_id","item_id");--> statement-breakpoint
CREATE INDEX "item_batch_expiry_idx" ON "item_batch" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "item_batch_grn_line_idx" ON "item_batch" USING btree ("goods_receipt_line_id");--> statement-breakpoint
CREATE INDEX "item_batch_grn_note_idx" ON "item_batch" USING btree ("goods_receipt_note_id");--> statement-breakpoint
CREATE INDEX "purchase_order_line_po_id_idx" ON "purchase_order_line" USING btree ("po_id");--> statement-breakpoint
CREATE INDEX "purchase_order_hospital_pr_idx" ON "purchase_order" USING btree ("hospital_id","pr_id");--> statement-breakpoint
CREATE INDEX "purchase_order_hospital_store_idx" ON "purchase_order" USING btree ("hospital_id","store_id");--> statement-breakpoint
CREATE INDEX "purchase_requisition_line_pr_id_idx" ON "purchase_requisition_line" USING btree ("pr_id");--> statement-breakpoint
CREATE INDEX "purchase_requisition_hospital_from_store_idx" ON "purchase_requisition" USING btree ("hospital_id","from_store_id");--> statement-breakpoint
CREATE INDEX "purchase_requisition_hospital_to_store_idx" ON "purchase_requisition" USING btree ("hospital_id","to_store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "med_order_dose_unit_inactive_hospital_dose_unit_uidx" ON "med_order_dose_unit_inactive" USING btree ("hospital_id","dose_unit_id");--> statement-breakpoint
CREATE INDEX "med_order_dose_unit_inactive_hospital_id_idx" ON "med_order_dose_unit_inactive" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "med_order_dose_unit_inactive_dose_unit_id_idx" ON "med_order_dose_unit_inactive" USING btree ("dose_unit_id");--> statement-breakpoint
CREATE INDEX "med_order_dose_unit_name_idx" ON "med_order_dose_unit" USING btree ("name");--> statement-breakpoint
CREATE INDEX "med_order_dose_unit_preset_idx" ON "med_order_dose_unit" USING btree ("is_preset") WHERE "med_order_dose_unit"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "med_order_duration_unit_inactive_hospital_unit_uidx" ON "med_order_duration_unit_inactive" USING btree ("hospital_id","duration_unit_id");--> statement-breakpoint
CREATE INDEX "med_order_duration_unit_inactive_hospital_id_idx" ON "med_order_duration_unit_inactive" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "med_order_duration_unit_inactive_duration_unit_id_idx" ON "med_order_duration_unit_inactive" USING btree ("duration_unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "med_order_duration_unit_global_code_uidx" ON "med_order_duration_unit" USING btree ("code") WHERE "med_order_duration_unit"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "med_order_duration_unit_preset_idx" ON "med_order_duration_unit" USING btree ("is_preset") WHERE "med_order_duration_unit"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "med_order_food_relation_inactive_hospital_food_uidx" ON "med_order_food_relation_inactive" USING btree ("hospital_id","food_relation_id");--> statement-breakpoint
CREATE INDEX "med_order_food_relation_inactive_hospital_id_idx" ON "med_order_food_relation_inactive" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "med_order_food_relation_inactive_food_relation_id_idx" ON "med_order_food_relation_inactive" USING btree ("food_relation_id");--> statement-breakpoint
CREATE INDEX "med_order_food_relation_name_idx" ON "med_order_food_relation" USING btree ("name");--> statement-breakpoint
CREATE INDEX "med_order_food_relation_preset_idx" ON "med_order_food_relation" USING btree ("is_preset") WHERE "med_order_food_relation"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "med_order_form_inactive_hospital_form_uidx" ON "med_order_form_inactive" USING btree ("hospital_id","form_id");--> statement-breakpoint
CREATE INDEX "med_order_form_inactive_hospital_id_idx" ON "med_order_form_inactive" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "med_order_form_inactive_form_id_idx" ON "med_order_form_inactive" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "med_order_form_name_idx" ON "med_order_form" USING btree ("name");--> statement-breakpoint
CREATE INDEX "med_order_form_preset_idx" ON "med_order_form" USING btree ("is_preset") WHERE "med_order_form"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "med_order_frequency_inactive_hospital_frequency_uidx" ON "med_order_frequency_inactive" USING btree ("hospital_id","frequency_id");--> statement-breakpoint
CREATE INDEX "med_order_frequency_inactive_hospital_id_idx" ON "med_order_frequency_inactive" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "med_order_frequency_inactive_frequency_id_idx" ON "med_order_frequency_inactive" USING btree ("frequency_id");--> statement-breakpoint
CREATE INDEX "med_order_frequency_label_idx" ON "med_order_frequency" USING btree ("label");--> statement-breakpoint
CREATE INDEX "med_order_frequency_preset_idx" ON "med_order_frequency" USING btree ("is_preset") WHERE "med_order_frequency"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "med_order_order_type_inactive_hospital_type_uidx" ON "med_order_order_type_inactive" USING btree ("hospital_id","order_type_id");--> statement-breakpoint
CREATE INDEX "med_order_order_type_inactive_hospital_id_idx" ON "med_order_order_type_inactive" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "med_order_order_type_inactive_order_type_id_idx" ON "med_order_order_type_inactive" USING btree ("order_type_id");--> statement-breakpoint
CREATE INDEX "med_order_order_type_name_idx" ON "med_order_order_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "med_order_order_type_preset_idx" ON "med_order_order_type" USING btree ("is_preset") WHERE "med_order_order_type"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "med_order_route_inactive_hospital_route_uidx" ON "med_order_route_inactive" USING btree ("hospital_id","route_id");--> statement-breakpoint
CREATE INDEX "med_order_route_inactive_hospital_id_idx" ON "med_order_route_inactive" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "med_order_route_inactive_route_id_idx" ON "med_order_route_inactive" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "med_order_route_name_idx" ON "med_order_route" USING btree ("name");--> statement-breakpoint
CREATE INDEX "med_order_route_preset_idx" ON "med_order_route" USING btree ("is_preset") WHERE "med_order_route"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "medication_order_batch_payment_batch_id_uidx" ON "medication_order_batch_payment" USING btree ("batch_id") WHERE "medication_order_batch_payment"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "medication_order_batch_payment_hospital_receipt_uidx" ON "medication_order_batch_payment" USING btree ("hospital_id","receipt_no") WHERE "medication_order_batch_payment"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "medication_order_batch_hospital_id_idx" ON "medication_order_batch" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "medication_order_batch_visit_id_idx" ON "medication_order_batch" USING btree ("visit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "medication_order_batch_hospital_batch_no_uidx" ON "medication_order_batch" USING btree ("hospital_id","batch_no") WHERE "medication_order_batch"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "medication_order_line_allocation_line_id_idx" ON "medication_order_line_allocation" USING btree ("line_id");--> statement-breakpoint
CREATE INDEX "medication_order_line_allocation_batch_id_idx" ON "medication_order_line_allocation" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "medication_order_line_batch_id_idx" ON "medication_order_line" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "marketplace_allowed_file_extension_name_idx" ON "marketplace_allowed_file_extension" USING btree ("name");--> statement-breakpoint
CREATE INDEX "marketplace_allowed_file_extension_code_idx" ON "marketplace_allowed_file_extension" USING btree ("code");--> statement-breakpoint
CREATE INDEX "marketplace_allowed_file_extension_status_id_idx" ON "marketplace_allowed_file_extension" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "marketplace_app_archive_version_idx" ON "marketplace_app_archive" USING btree ("version");--> statement-breakpoint
CREATE INDEX "marketplace_app_archive_app_id_idx" ON "marketplace_app_archive" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "marketplace_app_archive_file_extension_id_idx" ON "marketplace_app_archive" USING btree ("file_extension_id");--> statement-breakpoint
CREATE INDEX "marketplace_app_archive_status_id_idx" ON "marketplace_app_archive" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "marketplace_app_form_name_idx" ON "marketplace_app_form" USING btree ("name");--> statement-breakpoint
CREATE INDEX "marketplace_app_form_code_idx" ON "marketplace_app_form" USING btree ("code");--> statement-breakpoint
CREATE INDEX "marketplace_app_form_app_id_idx" ON "marketplace_app_form" USING btree ("app_id");--> statement-breakpoint
CREATE INDEX "marketplace_app_form_status_id_idx" ON "marketplace_app_form" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "marketplace_app_name_idx" ON "marketplace_app" USING btree ("name");--> statement-breakpoint
CREATE INDEX "marketplace_app_code_idx" ON "marketplace_app" USING btree ("code");--> statement-breakpoint
CREATE INDEX "marketplace_app_signature_idx" ON "marketplace_app" USING btree ("signature");--> statement-breakpoint
CREATE INDEX "marketplace_app_status_id_idx" ON "marketplace_app" USING btree ("status_id");