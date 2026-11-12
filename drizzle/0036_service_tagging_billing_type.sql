-- Billing setup: scope service_tagging rows by OP / IP / ER for auto-charges on visit close.

ALTER TABLE "service_tagging" ADD COLUMN IF NOT EXISTS "billing_type" varchar(8);

CREATE INDEX IF NOT EXISTS "service_tagging_branch_billing_type_idx"
	ON "service_tagging" ("branch_id", "billing_type");

INSERT INTO "page" ("id", "name", "module_id", "status_id", "parent_id", "page_url", "sequence_no")
VALUES
	(730000, 'Billing Setup', 1, 1, NULL, '/medora/home/administration/billing-setup', 16),
	(730001, 'OP Billing', 1, 1, 730000, '/medora/home/administration/billing-setup/op-billing', 1),
	(730002, 'IP Billing', 1, 1, 730000, '/medora/home/administration/billing-setup/ip-billing', 2),
	(730003, 'ED Billing', 1, 1, 730000, '/medora/home/administration/billing-setup/ed-billing', 3)
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"module_id" = EXCLUDED."module_id",
	"status_id" = EXCLUDED."status_id",
	"parent_id" = EXCLUDED."parent_id",
	"page_url" = EXCLUDED."page_url",
	"sequence_no" = EXCLUDED."sequence_no";

INSERT INTO user_group_page (user_group_id, page_id)
SELECT DISTINCT ugp.user_group_id, child.page_id
FROM user_group_page ugp
CROSS JOIN (VALUES (730000), (730001), (730002), (730003)) AS child(page_id)
WHERE ugp.page_id = 900005
	AND NOT EXISTS (
		SELECT 1
		FROM user_group_page x
		WHERE x.user_group_id = ugp.user_group_id
			AND x.page_id = child.page_id
	);
