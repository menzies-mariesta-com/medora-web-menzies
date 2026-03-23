ALTER TABLE "patient_document" ADD COLUMN IF NOT EXISTS "patient_attachment_id" integer;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_document" ADD CONSTRAINT "patient_document_patient_attachment_id_patient_attachment_id_fk" FOREIGN KEY ("patient_attachment_id") REFERENCES "public"."patient_attachment"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_document_patient_attachment_id_idx" ON "patient_document" USING btree ("patient_attachment_id");
