INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
VALUES (
	100707,
	'Reusable Global Documents',
	1,
	1,
	100700,
	'/medora/home/administration/document-master/reusable-global-documents',
	5
)
ON CONFLICT (id) DO UPDATE SET
	name = EXCLUDED.name,
	module_id = EXCLUDED.module_id,
	status_id = EXCLUDED.status_id,
	parent_id = EXCLUDED.parent_id,
	page_url = EXCLUDED.page_url,
	sequence_no = EXCLUDED.sequence_no,
	updated_at = now();
--> statement-breakpoint
INSERT INTO user_group_page (user_group_id, page_id)
SELECT ugp.user_group_id, 100707
FROM user_group_page ugp
WHERE ugp.page_id = 100702
	AND NOT EXISTS (
		SELECT 1
		FROM user_group_page x
		WHERE x.user_group_id = ugp.user_group_id
			AND x.page_id = 100707
	);
