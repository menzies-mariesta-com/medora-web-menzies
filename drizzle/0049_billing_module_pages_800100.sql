-- Billing module: Bill + Advance Deposit as top-level module pages (ids 800100 / 800200).

UPDATE module
SET module_url = '/medora/home/billing/bill',
	updated_at = now()
WHERE id = 8;

INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
VALUES
	(800100, 'Bill', 8, 1, null, '/medora/home/billing/bill', 1),
	(800200, 'Advance Deposit', 8, 1, null, '/medora/home/billing/advance-deposit', 2)
ON CONFLICT (id) DO UPDATE SET
	name = EXCLUDED.name,
	module_id = EXCLUDED.module_id,
	status_id = EXCLUDED.status_id,
	parent_id = EXCLUDED.parent_id,
	page_url = EXCLUDED.page_url,
	sequence_no = EXCLUDED.sequence_no,
	updated_at = now();

INSERT INTO user_group_page (user_group_id, page_id)
SELECT DISTINCT ugp.user_group_id, child.page_id
FROM user_group_page ugp
CROSS JOIN (VALUES (800100), (800200)) AS child(page_id)
WHERE ugp.page_id IN (810001, 810002, 800100, 800200, 15, 150001, 150002, 150003, 150004)
	AND NOT EXISTS (
		SELECT 1
		FROM user_group_page x
		WHERE x.user_group_id = ugp.user_group_id
			AND x.page_id = child.page_id
	);

DELETE FROM user_group_page WHERE page_id IN (800000, 810001, 810002);
DELETE FROM page WHERE id IN (800000, 810001, 810002);
