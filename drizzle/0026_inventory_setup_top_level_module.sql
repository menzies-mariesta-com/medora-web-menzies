-- Inventory Setup as its own module (top-level): move pages out of Administration module
INSERT INTO "module" ("id", "name", "sequence_no", "status_id", "module_url", "image_url", "created_at", "updated_at")
VALUES (
	9,
	'Inventory Setup',
	9,
	1,
	'/heka/home/inventory-setup',
	'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box-icon lucide-box"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M2 6h20v12H2z"/><path d="M16 10V6a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4"/></svg>',
	now(),
	now()
)
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"sequence_no" = EXCLUDED."sequence_no",
	"status_id" = EXCLUDED."status_id",
	"module_url" = EXCLUDED."module_url",
	"image_url" = EXCLUDED."image_url",
	"updated_at" = now();
--> statement-breakpoint
UPDATE "page" SET
	"module_id" = 9,
	"parent_id" = NULL,
	"page_url" = '/heka/home/inventory-setup',
	"sequence_no" = 1,
	"updated_at" = now()
WHERE "id" = 22;
--> statement-breakpoint
UPDATE "page" SET
	"module_id" = 9,
	"parent_id" = 22,
	"page_url" = '/heka/home/inventory-setup/stores',
	"sequence_no" = 1,
	"updated_at" = now()
WHERE "id" = 19;
--> statement-breakpoint
UPDATE "page" SET
	"module_id" = 9,
	"parent_id" = 22,
	"page_url" = '/heka/home/inventory-setup/item-master',
	"sequence_no" = 2,
	"updated_at" = now()
WHERE "id" = 20;
--> statement-breakpoint
UPDATE "page" SET
	"module_id" = 9,
	"parent_id" = 22,
	"page_url" = '/heka/home/inventory-setup/pharmacy-generic',
	"sequence_no" = 3,
	"updated_at" = now()
WHERE "id" = 21;
--> statement-breakpoint
UPDATE "page" SET
	"module_id" = 9,
	"parent_id" = 22,
	"page_url" = '/heka/home/inventory-setup/unit-master',
	"sequence_no" = 4,
	"updated_at" = now()
WHERE "id" = 23;
--> statement-breakpoint
UPDATE "page" SET
	"module_id" = 9,
	"parent_id" = 22,
	"page_url" = '/heka/home/inventory-setup/item-unit-master',
	"sequence_no" = 5,
	"updated_at" = now()
WHERE "id" = 24;

