-- Page id convention: Staff 100000, Patient 200000; Billing 810001 / 810002.

INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
VALUES
	(100000, 'Staff', 1, 1, null, '/medora/home/administration/staff', 1),
	(200000, 'Patient', 2, 1, null, '/medora/home/registration/patient', 1)
ON CONFLICT (id) DO UPDATE SET
	name = EXCLUDED.name,
	module_id = EXCLUDED.module_id,
	status_id = EXCLUDED.status_id,
	parent_id = EXCLUDED.parent_id,
	page_url = EXCLUDED.page_url,
	sequence_no = EXCLUDED.sequence_no,
	updated_at = now();

UPDATE page SET parent_id = 100000, updated_at = now() WHERE id IN (100001, 100002);
UPDATE page SET parent_id = 200000, updated_at = now() WHERE id IN (200001, 200002);

INSERT INTO user_group_page (user_group_id, page_id)
SELECT ugp.user_group_id, 100000
FROM user_group_page ugp
WHERE ugp.page_id = 1
	AND NOT EXISTS (
		SELECT 1 FROM user_group_page x
		WHERE x.user_group_id = ugp.user_group_id AND x.page_id = 100000
	);

INSERT INTO user_group_page (user_group_id, page_id)
SELECT ugp.user_group_id, 200000
FROM user_group_page ugp
WHERE ugp.page_id = 2
	AND NOT EXISTS (
		SELECT 1 FROM user_group_page x
		WHERE x.user_group_id = ugp.user_group_id AND x.page_id = 200000
	);

DELETE FROM user_group_page WHERE page_id IN (1, 2);
DELETE FROM page WHERE id IN (1, 2);

INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
VALUES
	(810001, 'Bill', 8, 1, null, '/medora/home/billing/bill', 1),
	(810002, 'Advance Deposit', 8, 1, null, '/medora/home/billing/advance-deposit', 2)
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
CROSS JOIN (VALUES (810001), (810002)) AS child(page_id)
WHERE ugp.page_id IN (15, 150001, 150003, 150004, 150002, 810001, 810002)
	AND NOT EXISTS (
		SELECT 1
		FROM user_group_page x
		WHERE x.user_group_id = ugp.user_group_id
			AND x.page_id = child.page_id
	);

DELETE FROM user_group_page WHERE page_id IN (15, 150001, 150004, 150003, 150002);
DELETE FROM page WHERE id IN (15, 150001, 150004, 150003, 150002);
