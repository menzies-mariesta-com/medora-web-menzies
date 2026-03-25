CREATE TABLE IF NOT EXISTS "form_name" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(128) NOT NULL UNIQUE,
	"name" varchar(512),
	"form_type" varchar(128),
	"status_id" integer DEFAULT 1 NOT NULL REFERENCES "public"."status"("id"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	"updated_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	"deleted_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
INSERT INTO "form_name" (id, code, name, form_type, status_id)
VALUES
	(1, 'chief_complaint', 'Chief complaint', 'observation_emr_visit', 1),
	(2, 'patient_condition', 'Patient condition', 'observation_emr_visit', 1),
	(3, 'diagnosis_notes', 'Diagnosis notes', 'observation_emr_visit', 1),
	(4, 'patient_registration', 'Patient registration', 'registration', 1)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_name_code_idx" ON "form_name" USING btree ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_name_name_idx" ON "form_name" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_name_form_type_idx" ON "form_name" USING btree ("form_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_name_status_id_idx" ON "form_name" USING btree ("status_id");
