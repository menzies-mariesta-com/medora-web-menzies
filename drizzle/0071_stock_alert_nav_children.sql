-- Stock alerts: Policy + Recipients as child pages (inventory-setup tab strip).
-- Parent page id 42 = "Stock alerts" (see information-table-seed); avoids collision with medication-order page id 33.

INSERT INTO "page" ("id", "name", "module_id", "status_id", "parent_id", "page_url", "sequence_no", "created_at", "updated_at")
VALUES
	(420001, 'Policy', 9, 1, 42, '/medora/home/inventory-setup/stock-alerts/policy', 1, now(), now()),
	(420002, 'Recipients', 9, 1, 42, '/medora/home/inventory-setup/stock-alerts/recipients', 2, now(), now())
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"module_id" = EXCLUDED."module_id",
	"status_id" = EXCLUDED."status_id",
	"parent_id" = EXCLUDED."parent_id",
	"page_url" = EXCLUDED."page_url",
	"sequence_no" = EXCLUDED."sequence_no",
	"updated_at" = now();
