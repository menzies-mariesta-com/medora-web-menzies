-- Merge Visit statuses Closed (8) + Discharged (55) into one: Closed / Discharged.
--> statement-breakpoint
UPDATE "patient_visit"
SET "status_tagging_id" = 8
WHERE "status_tagging_id" = 55;
--> statement-breakpoint
UPDATE "status_tagging"
SET
	"name" = 'Closed / Discharged',
	"code" = 'closed_discharged',
	"sequence_no" = 4
WHERE "id" = 8 AND "status_tagging_type_id" = 2;
--> statement-breakpoint
DELETE FROM "status_tagging"
WHERE "id" = 55 AND "status_tagging_type_id" = 2;
