UPDATE page SET status_id = 4 WHERE id IN (100704, 100705);

INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
VALUES (
	100707,
	'Reusable Global Documents',
	1,
	1,
	100700,
	'/medora/home/administration/document-master/reusable-global-documents',
	4
)
ON CONFLICT (id) DO UPDATE SET
	name = EXCLUDED.name,
	page_url = EXCLUDED.page_url,
	sequence_no = EXCLUDED.sequence_no,
	status_id = EXCLUDED.status_id;
