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
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role_id" integer,
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
CREATE TABLE "blood_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "city" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"state_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "craft_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512) NOT NULL,
	"status_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gender" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marital_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nationality" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postal_code" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" integer NOT NULL,
	"city_id" integer NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refer_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "religion" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specialization" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"craft_group_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_employment_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_shift_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "state" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"country_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "title" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"unit_type_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"code" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekday" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointment_block" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" uuid NOT NULL,
	"hospital_id" uuid,
	"block_date" date NOT NULL,
	"from_time" time NOT NULL,
	"to_time" time NOT NULL,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hospital_department" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"department_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hospital_patient_code_counter" (
	"hospital_id" uuid PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hospital_visit_code_counter" (
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"visit_type_id" integer NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hospital_visit_code_counter_hospital_id_branch_id_visit_type_id_year_pk" PRIMARY KEY("hospital_id","branch_id","visit_type_id","year")
);
--> statement-breakpoint
CREATE TABLE "insurance_table" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_allergies" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"description" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_attachment" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"file_url" text,
	"description" text,
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"symptom" text,
	"description" text,
	"remark" text,
	"vital_date_time" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_insurance" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"insurance_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"status_type_id" integer,
	"visit_type_id" integer,
	"status_id" integer DEFAULT 1 NOT NULL,
	"visit_no" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_branch" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_department" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" uuid NOT NULL,
	"department_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_hospital" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" uuid NOT NULL,
	"hospital_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	CONSTRAINT "staff_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "staff_user_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" uuid NOT NULL,
	"user_group_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_tagging_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_group_page" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_group_id" integer,
	"page_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL,
	"hospital_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_type" ADD CONSTRAINT "blood_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city" ADD CONSTRAINT "city_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "city" ADD CONSTRAINT "city_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "country" ADD CONSTRAINT "country_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "craft_group" ADD CONSTRAINT "craft_group_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gender" ADD CONSTRAINT "gender_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_type" ADD CONSTRAINT "identity_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marital_status" ADD CONSTRAINT "marital_status_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nationality" ADD CONSTRAINT "nationality_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position" ADD CONSTRAINT "position_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postal_code" ADD CONSTRAINT "postal_code_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postal_code" ADD CONSTRAINT "postal_code_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refer_type" ADD CONSTRAINT "refer_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "religion" ADD CONSTRAINT "religion_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialization" ADD CONSTRAINT "specialization_craft_group_id_craft_group_id_fk" FOREIGN KEY ("craft_group_id") REFERENCES "public"."craft_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "specialization" ADD CONSTRAINT "specialization_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_employment_type" ADD CONSTRAINT "staff_employment_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shift_type" ADD CONSTRAINT "staff_shift_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_type" ADD CONSTRAINT "staff_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state" ADD CONSTRAINT "state_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "state" ADD CONSTRAINT "state_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "title" ADD CONSTRAINT "title_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_unit_type_id_unit_type_id_fk" FOREIGN KEY ("unit_type_id") REFERENCES "public"."unit_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_type" ADD CONSTRAINT "unit_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_type" ADD CONSTRAINT "visit_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekday" ADD CONSTRAINT "weekday_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_block" ADD CONSTRAINT "appointment_block_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_block" ADD CONSTRAINT "appointment_block_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_block" ADD CONSTRAINT "appointment_block_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_patient_title_id_title_id_fk" FOREIGN KEY ("patient_title_id") REFERENCES "public"."title"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_refer_type_id_refer_type_id_fk" FOREIGN KEY ("refer_type_id") REFERENCES "public"."refer_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_external_refer_id_external_refer_id_fk" FOREIGN KEY ("external_refer_id") REFERENCES "public"."external_refer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_status_tagging_id_status_tagging_id_fk" FOREIGN KEY ("status_tagging_id") REFERENCES "public"."status_tagging"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_weekday_id_weekday_id_fk" FOREIGN KEY ("weekday_id") REFERENCES "public"."weekday"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_schedule" ADD CONSTRAINT "doctor_schedule_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_refer_type_id_refer_type_id_fk" FOREIGN KEY ("refer_type_id") REFERENCES "public"."refer_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_title_id_title_id_fk" FOREIGN KEY ("title_id") REFERENCES "public"."title"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_postal_code_id_postal_code_id_fk" FOREIGN KEY ("postal_code_id") REFERENCES "public"."postal_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_phone_country_id_country_id_fk" FOREIGN KEY ("phone_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_refer" ADD CONSTRAINT "external_refer_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_phone_country_id_country_id_fk" FOREIGN KEY ("phone_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_postal_code_id_postal_code_id_fk" FOREIGN KEY ("postal_code_id") REFERENCES "public"."postal_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_department" ADD CONSTRAINT "hospital_department_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_department" ADD CONSTRAINT "hospital_department_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_patient_code_counter" ADD CONSTRAINT "hospital_patient_code_counter_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_phone_country_id_country_id_fk" FOREIGN KEY ("phone_country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_postal_code_id_postal_code_id_fk" FOREIGN KEY ("postal_code_id") REFERENCES "public"."postal_code"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_city_id_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."city"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_state_id_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."state"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_country_id_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital" ADD CONSTRAINT "hospital_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_visit_code_counter" ADD CONSTRAINT "hospital_visit_code_counter_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_visit_code_counter" ADD CONSTRAINT "hospital_visit_code_counter_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_visit_code_counter" ADD CONSTRAINT "hospital_visit_code_counter_visit_type_id_visit_type_id_fk" FOREIGN KEY ("visit_type_id") REFERENCES "public"."visit_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_table" ADD CONSTRAINT "insurance_table_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "module" ADD CONSTRAINT "module_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_module_id_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page" ADD CONSTRAINT "page_parent_id_page_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."page"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_attachment" ADD CONSTRAINT "patient_attachment_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_attachment" ADD CONSTRAINT "patient_attachment_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_insurance" ADD CONSTRAINT "patient_insurance_insurance_id_insurance_table_id_fk" FOREIGN KEY ("insurance_id") REFERENCES "public"."insurance_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_doctor_id_staff_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_visit_type_id_visit_type_id_fk" FOREIGN KEY ("visit_type_id") REFERENCES "public"."visit_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_visit" ADD CONSTRAINT "patient_visit_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_branch" ADD CONSTRAINT "staff_branch_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_branch" ADD CONSTRAINT "staff_branch_branch_id_hospital_branch_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_department" ADD CONSTRAINT "staff_department_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_department" ADD CONSTRAINT "staff_department_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_detail" ADD CONSTRAINT "staff_detail_blood_type_id_blood_type_id_fk" FOREIGN KEY ("blood_type_id") REFERENCES "public"."blood_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_detail" ADD CONSTRAINT "staff_detail_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_hospital" ADD CONSTRAINT "staff_hospital_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_hospital" ADD CONSTRAINT "staff_hospital_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
ALTER TABLE "staff_user_group" ADD CONSTRAINT "staff_user_group_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_user_group" ADD CONSTRAINT "staff_user_group_user_group_id_user_group_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "public"."user_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_tagging" ADD CONSTRAINT "status_tagging_status_tagging_type_id_status_tagging_type_id_fk" FOREIGN KEY ("status_tagging_type_id") REFERENCES "public"."status_tagging_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_tagging" ADD CONSTRAINT "status_tagging_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_tagging_type" ADD CONSTRAINT "status_tagging_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_page" ADD CONSTRAINT "user_group_page_user_group_id_user_group_id_fk" FOREIGN KEY ("user_group_id") REFERENCES "public"."user_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_page" ADD CONSTRAINT "user_group_page_page_id_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blood_type_name_idx" ON "blood_type" USING btree ("name");--> statement-breakpoint
CREATE INDEX "blood_type_status_id_idx" ON "blood_type" USING btree ("status_id");--> statement-breakpoint
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
CREATE INDEX "weekday_status_id_idx" ON "weekday" USING btree ("status_id");