CREATE TABLE IF NOT EXISTS "financial_year" (
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
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prefix_configuration" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(128) NOT NULL,
	"description" text,
	"format" jsonb NOT NULL,
	"financial_year_id" integer,
	"last_no" integer DEFAULT 0 NOT NULL,
	"hospital_id" uuid NOT NULL,
	"branch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text
);
--> statement-breakpoint
ALTER TABLE "financial_year"
	ADD CONSTRAINT "financial_year_hospital_id_hospital_id_fk"
	FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id")
	ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "prefix_configuration"
	ADD CONSTRAINT "prefix_configuration_hospital_id_hospital_id_fk"
	FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id")
	ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "prefix_configuration"
	ADD CONSTRAINT "prefix_configuration_branch_id_hospital_branch_id_fk"
	FOREIGN KEY ("branch_id") REFERENCES "public"."hospital_branch"("id")
	ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "prefix_configuration"
	ADD CONSTRAINT "prefix_configuration_financial_year_id_financial_year_id_fk"
	FOREIGN KEY ("financial_year_id") REFERENCES "public"."financial_year"("id")
	ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "financial_year_hospital_code_unique"
	ON "financial_year" ("hospital_id","code");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "prefix_configuration_scope_key_unique"
	ON "prefix_configuration" ("hospital_id","branch_id","financial_year_id","key");
--> statement-breakpoint
DROP TABLE IF EXISTS "hospital_patient_code_counter";
--> statement-breakpoint
DROP TABLE IF EXISTS "hospital_visit_code_counter";

