-- Link IPD admission to source OPD visit (conversion)
--> statement-breakpoint
ALTER TABLE "ipd_admission" ADD COLUMN IF NOT EXISTS "source_opd_visit_id" integer;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ipd_admission" ADD CONSTRAINT "ipd_admission_source_opd_visit_id_patient_visit_id_fk"
		FOREIGN KEY ("source_opd_visit_id") REFERENCES "public"."patient_visit"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ipd_admission_source_opd_visit_id_idx" ON "ipd_admission" USING btree ("source_opd_visit_id");
