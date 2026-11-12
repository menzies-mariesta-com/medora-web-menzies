-- Billing module: parent section page + Bill / Advance Deposit as children (like Staff / Patient).
INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
VALUES
	(150000, 'Billing', 8, 1, null, '/medora/home/billing', 1)
ON CONFLICT (id) DO UPDATE SET
	name = EXCLUDED.name,
	module_id = EXCLUDED.module_id,
	status_id = EXCLUDED.status_id,
	parent_id = EXCLUDED.parent_id,
	page_url = EXCLUDED.page_url,
	sequence_no = EXCLUDED.sequence_no,
	updated_at = now();

UPDATE page
SET parent_id = 150000,
	sequence_no = 1,
	updated_at = now()
WHERE id = 150003;

UPDATE page
SET parent_id = 150000,
	sequence_no = 2,
	updated_at = now()
WHERE id = 150002;

UPDATE module
SET module_url = '/medora/home/billing',
	updated_at = now()
WHERE id = 8;
