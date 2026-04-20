CREATE TABLE IF NOT EXISTS "progress_note" (
	"id" serial PRIMARY KEY NOT NULL,
	"branch_id" uuid NOT NULL REFERENCES "public"."hospital_branch"("id"),
	"patient_id" uuid NOT NULL REFERENCES "public"."patient"("id"),
	"visit_id" integer NOT NULL REFERENCES "public"."patient_visit"("id"),
	"note" text DEFAULT '' NOT NULL,
	"delete_remark" text,
	"status_id" integer DEFAULT 1 NOT NULL REFERENCES "public"."status"("id"),
	"doctor_id" uuid REFERENCES "public"."staff"("id"),
	"sequence_no" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	"updated_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade,
	"deleted_by" text REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_note_visit_id_idx" ON "progress_note" USING btree ("visit_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_note_patient_id_idx" ON "progress_note" USING btree ("patient_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_note_branch_id_idx" ON "progress_note" USING btree ("branch_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_note_status_id_idx" ON "progress_note" USING btree ("status_id");
