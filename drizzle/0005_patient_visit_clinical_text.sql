ALTER TABLE "patient_visit" ADD COLUMN IF NOT EXISTS "chief_complaint" text;
ALTER TABLE "patient_visit" ADD COLUMN IF NOT EXISTS "patient_condition" text;
ALTER TABLE "patient_visit" ADD COLUMN IF NOT EXISTS "diagnosis_notes" text;
