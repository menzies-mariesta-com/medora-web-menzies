-- Consolidate CPOE + Observation into Consultation module (module id 6).
UPDATE "module" SET
	"name" = 'Consultation',
	"module_url" = '/medora/home/consultation',
	"updated_at" = now()
WHERE "id" = 6;
--> statement-breakpoint
UPDATE "module" SET
	"status_id" = 2,
	"updated_at" = now()
WHERE "id" = 7;
--> statement-breakpoint
INSERT INTO "page" ("id", "name", "module_id", "status_id", "parent_id", "page_url", "sequence_no", "created_at", "updated_at")
VALUES (
	1500001,
	'CPOE',
	6,
	1,
	NULL,
	'/medora/home/consultation/cpoe',
	2,
	now(),
	now()
)
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"module_id" = EXCLUDED."module_id",
	"status_id" = EXCLUDED."status_id",
	"parent_id" = EXCLUDED."parent_id",
	"page_url" = EXCLUDED."page_url",
	"sequence_no" = EXCLUDED."sequence_no",
	"updated_at" = now();
--> statement-breakpoint
UPDATE "page" SET
	"name" = 'EMR',
	"module_id" = 6,
	"parent_id" = NULL,
	"page_url" = '/medora/home/consultation/emr',
	"sequence_no" = 1,
	"updated_at" = now()
WHERE "id" = 13;
--> statement-breakpoint
UPDATE "page" SET
	"module_id" = 6,
	"parent_id" = 1500001,
	"page_url" = '/medora/home/consultation/cpoe/order',
	"sequence_no" = 1,
	"updated_at" = now()
WHERE "id" = 11;
--> statement-breakpoint
UPDATE "page" SET
	"module_id" = 6,
	"parent_id" = 1500001,
	"page_url" = '/medora/home/consultation/cpoe/prescription',
	"sequence_no" = 2,
	"updated_at" = now()
WHERE "id" = 12;
--> statement-breakpoint
UPDATE "page" SET
	"module_id" = 6,
	"parent_id" = 1500001,
	"page_url" = '/medora/home/consultation/cpoe/refer',
	"sequence_no" = 3,
	"updated_at" = now()
WHERE "id" = 14;
--> statement-breakpoint
UPDATE "page" SET
	"page_url" = '/medora/home/consultation/cpoe/refer/doctor',
	"updated_at" = now()
WHERE "id" = 1400001;
--> statement-breakpoint
UPDATE "page" SET
	"page_url" = '/medora/home/consultation/cpoe/refer/history',
	"updated_at" = now()
WHERE "id" = 1400002;
