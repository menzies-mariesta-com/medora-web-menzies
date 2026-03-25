CREATE TABLE IF NOT EXISTS "patient_form_entry" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" uuid NOT NULL REFERENCES "public"."hospital_branch"("id"),
	"patient_id" uuid NOT NULL REFERENCES "public"."patient"("id"),
	"visit_id" integer NOT NULL REFERENCES "public"."patient_visit"("id"),
	"form_name_id" integer NOT NULL REFERENCES "public"."form_name"("id"),
	"description" text,
	"status_id" integer DEFAULT 1 NOT NULL REFERENCES "public"."status"("id"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	"updated_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	"deleted_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_form_entry_branch_id_idx" ON "patient_form_entry" USING btree ("branch_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_form_entry_patient_id_idx" ON "patient_form_entry" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_form_entry_visit_id_idx" ON "patient_form_entry" USING btree ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_form_entry_form_name_id_idx" ON "patient_form_entry" USING btree ("form_name_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_form_entry_status_id_idx" ON "patient_form_entry" USING btree ("status_id");
