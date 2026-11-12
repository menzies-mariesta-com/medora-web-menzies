-- Inventory Setup: Pricing configuration parent + config / formula-templates children (stock-alerts pattern).

UPDATE page
SET
	name = 'Pricing configuration',
	page_url = '/medora/home/inventory-setup/pricing-configuration',
	parent_id = NULL,
	sequence_no = 9,
	updated_at = now()
WHERE id = 900800;

UPDATE page
SET
	name = 'Assignments',
	page_url = '/medora/home/inventory-setup/pricing-configuration/config',
	parent_id = 900800,
	sequence_no = 1,
	updated_at = now()
WHERE id = 900801;

INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
VALUES (
	900802,
	'Formula templates',
	9,
	1,
	900800,
	'/medora/home/inventory-setup/pricing-configuration/formula-templates',
	2
)
ON CONFLICT (id) DO UPDATE SET
	name = EXCLUDED.name,
	module_id = EXCLUDED.module_id,
	status_id = EXCLUDED.status_id,
	parent_id = EXCLUDED.parent_id,
	page_url = EXCLUDED.page_url,
	sequence_no = EXCLUDED.sequence_no,
	updated_at = now();

INSERT INTO user_group_page (user_group_id, page_id)
SELECT ugp.user_group_id, 900802
FROM user_group_page ugp
WHERE ugp.page_id = 900801
	AND NOT EXISTS (
		SELECT 1
		FROM user_group_page x
		WHERE x.user_group_id = ugp.user_group_id
			AND x.page_id = 900802
	);
