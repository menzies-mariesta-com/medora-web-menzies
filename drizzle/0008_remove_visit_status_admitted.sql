-- Remove Visit status tagging "Admitted" (id 54).
-- Visit workflow is Open → Vital → Seen → Closed / Discharged.
-- Inpatient presence is tracked via ipd_admission.admission_status, not visit status_tagging.
--> statement-breakpoint
UPDATE "patient_visit"
SET "status_tagging_id" = 7
WHERE "status_tagging_id" = 54;
--> statement-breakpoint
UPDATE "status_tagging"
SET "sequence_no" = 4
WHERE "id" = 55 AND "status_tagging_type_id" = 2;
--> statement-breakpoint
UPDATE "status_tagging"
SET "sequence_no" = 5
WHERE "id" = 8 AND "status_tagging_type_id" = 2;
--> statement-breakpoint
DELETE FROM "status_tagging"
WHERE "id" = 54 AND "status_tagging_type_id" = 2;
