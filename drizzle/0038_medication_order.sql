CREATE TABLE IF NOT EXISTS "med_order_form" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"description" text,
	"status_id" integer NOT NULL DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "med_order_form_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_form_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "med_order_form_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_form_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_form_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_form_hospital_id_idx" ON "med_order_form" ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_form_name_idx" ON "med_order_form" ("name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "med_order_route" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"description" text,
	"status_id" integer NOT NULL DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "med_order_route_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_route_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "med_order_route_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_route_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_route_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_route_hospital_id_idx" ON "med_order_route" ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_route_name_idx" ON "med_order_route" ("name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "med_order_order_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"description" text,
	"status_id" integer NOT NULL DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "med_order_order_type_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_order_type_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "med_order_order_type_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_order_type_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_order_type_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_order_type_hospital_id_idx" ON "med_order_order_type" ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_order_type_name_idx" ON "med_order_order_type" ("name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "med_order_dose_unit" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"description" text,
	"status_id" integer NOT NULL DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "med_order_dose_unit_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_dose_unit_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "med_order_dose_unit_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_dose_unit_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_dose_unit_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_dose_unit_hospital_id_idx" ON "med_order_dose_unit" ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_dose_unit_name_idx" ON "med_order_dose_unit" ("name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "med_order_food_relation" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"name" varchar(512) NOT NULL,
	"description" text,
	"status_id" integer NOT NULL DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "med_order_food_relation_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_food_relation_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "med_order_food_relation_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_food_relation_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_food_relation_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_food_relation_hospital_id_idx" ON "med_order_food_relation" ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_food_relation_name_idx" ON "med_order_food_relation" ("name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "med_order_duration_unit" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(512) NOT NULL,
	"sequence_no" integer NOT NULL DEFAULT 0,
	"status_id" integer NOT NULL DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "med_order_duration_unit_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_duration_unit_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "med_order_duration_unit_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_duration_unit_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_duration_unit_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_duration_unit_hospital_id_idx" ON "med_order_duration_unit" ("hospital_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "med_order_duration_unit_hospital_code_uidx" ON "med_order_duration_unit" ("hospital_id", "code") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "med_order_frequency" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"label" varchar(512) NOT NULL,
	"kind" varchar(64) NOT NULL DEFAULT 'custom',
	"config" jsonb NOT NULL DEFAULT '{}',
	"summary_text" text,
	"status_id" integer NOT NULL DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "med_order_frequency_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "med_order_frequency_status_id_status_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."status"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "med_order_frequency_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_frequency_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "med_order_frequency_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_frequency_hospital_id_idx" ON "med_order_frequency" ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_order_frequency_label_idx" ON "med_order_frequency" ("label");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medication_order_batch" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" uuid NOT NULL,
	"visit_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"batch_no" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "medication_order_batch_hospital_id_hospital_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospital"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "medication_order_batch_visit_id_patient_visit_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "medication_order_batch_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "medication_order_batch_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "medication_order_batch_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "medication_order_batch_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_order_batch_hospital_id_idx" ON "medication_order_batch" ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_order_batch_visit_id_idx" ON "medication_order_batch" ("visit_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "medication_order_batch_hospital_batch_no_uidx" ON "medication_order_batch" ("hospital_id", "batch_no") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medication_order_line" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"line_no" integer NOT NULL DEFAULT 1,
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
	"substitute_not_allowed" boolean NOT NULL DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text,
	"updated_by" text,
	"deleted_by" text,
	CONSTRAINT "medication_order_line_batch_id_medication_order_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."medication_order_batch"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "medication_order_line_item_master_id_item_master_id_fk" FOREIGN KEY ("item_master_id") REFERENCES "public"."item_master"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "medication_order_line_dose_unit_id_med_order_dose_unit_id_fk" FOREIGN KEY ("dose_unit_id") REFERENCES "public"."med_order_dose_unit"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "medication_order_line_frequency_id_med_order_frequency_id_fk" FOREIGN KEY ("frequency_id") REFERENCES "public"."med_order_frequency"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "medication_order_line_duration_unit_id_med_order_duration_unit_id_fk" FOREIGN KEY ("duration_unit_id") REFERENCES "public"."med_order_duration_unit"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "medication_order_line_form_id_med_order_form_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."med_order_form"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "medication_order_line_route_id_med_order_route_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."med_order_route"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "medication_order_line_order_type_id_med_order_order_type_id_fk" FOREIGN KEY ("order_type_id") REFERENCES "public"."med_order_order_type"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "medication_order_line_food_relation_id_med_order_food_relation_id_fk" FOREIGN KEY ("food_relation_id") REFERENCES "public"."med_order_food_relation"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "medication_order_line_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "medication_order_line_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	CONSTRAINT "medication_order_line_deleted_by_user_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medication_order_line_batch_id_idx" ON "medication_order_line" ("batch_id");
--> statement-breakpoint
INSERT INTO "med_order_duration_unit" ("hospital_id", "code", "name", "sequence_no", "status_id")
SELECT h."id" AS hospital_id, v.code, v.name, v.seq, 1
FROM "hospital" h
CROSS JOIN (
	VALUES
		('minute', 'Minute', 1),
		('hour', 'Hour', 2),
		('day', 'Day', 3),
		('week', 'Week', 4),
		('month', 'Month', 5)
) AS v (code, name, seq)
WHERE NOT EXISTS (
	SELECT 1 FROM "med_order_duration_unit" d
	WHERE d."hospital_id" = h."id" AND d."code" = v.code AND d."deleted_at" IS NULL
);