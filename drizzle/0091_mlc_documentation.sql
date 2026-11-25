-- MLC documentation: legal register number and addendum chain on clinical_form_instance.

-- Register number (MLC_NO prefix). Unique per hospital when present.
ALTER TABLE "clinical_form_instance" ADD COLUMN IF NOT EXISTS "form_number" varchar(64);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "clinical_form_instance_mlc_no_uidx"
	ON "clinical_form_instance" ("hospital_id", "form_number")
	WHERE "form_number" IS NOT NULL;
--> statement-breakpoint

-- Addendum link: a correction is a new row pointing at the signed original.
ALTER TABLE "clinical_form_instance" ADD COLUMN IF NOT EXISTS "parent_instance_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinical_form_instance" ADD CONSTRAINT "clinical_form_instance_parent_instance_id_fk" FOREIGN KEY ("parent_instance_id") REFERENCES "public"."clinical_form_instance"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "clinical_form_instance_context_idx"
	ON "clinical_form_instance" ("visit_id", "context_type");
