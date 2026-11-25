-- ED triage signing audit: when, and by which staff member.
ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "triaged_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "ed_encounter" ADD COLUMN IF NOT EXISTS "triaged_by" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ed_encounter" ADD CONSTRAINT "ed_encounter_triaged_by_staff_id_fk" FOREIGN KEY ("triaged_by") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
