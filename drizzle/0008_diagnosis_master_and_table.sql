CREATE TABLE IF NOT EXISTS "diagnosis_type" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(512),
	"status_id" integer DEFAULT 1 NOT NULL REFERENCES "public"."status"("id"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	"updated_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	"deleted_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
INSERT INTO "diagnosis_type" (id, name, status_id)
VALUES
	(1, 'Provisional', 1),
	(2, 'Final', 1),
	(3, 'Chronic', 1)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnosis_type_name_idx" ON "diagnosis_type" USING btree ("name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnosis_type_status_id_idx" ON "diagnosis_type" USING btree ("status_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "diagnosis" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" uuid NOT NULL REFERENCES "public"."hospital_branch"("id"),
	"patient_id" uuid NOT NULL REFERENCES "public"."patient"("id"),
	"visit_id" integer NOT NULL REFERENCES "public"."patient_visit"("id"),
	"diagnosis_type_id" integer NOT NULL REFERENCES "public"."diagnosis_type"("id"),
	"status_id" integer DEFAULT 1 NOT NULL REFERENCES "public"."status"("id"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	"updated_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	"deleted_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnosis_branch_id_idx" ON "diagnosis" USING btree ("branch_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnosis_patient_id_idx" ON "diagnosis" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnosis_visit_id_idx" ON "diagnosis" USING btree ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diagnosis_diagnosis_type_id_idx" ON "diagnosis" USING btree ("diagnosis_type_id");

