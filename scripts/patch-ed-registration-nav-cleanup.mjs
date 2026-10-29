/**
 * Retire ED registration list + purchase item; add Nursing Workbench MLC tab.
 *
 * Run: node --env-file=.env scripts/patch-ed-registration-nav-cleanup.mjs
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const sql = neon(url);

const retiredPageIds = [123002, 125];

const statements = [
	`DELETE FROM user_group_page WHERE page_id IN (${retiredPageIds.join(', ')})`,
	`DELETE FROM page WHERE id IN (${retiredPageIds.join(', ')})`,
	`INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
	VALUES (800016, 'MLC documentation', 4, 1, 910000, '/medora/home/nursing-workbench/mlc-documentation', 15)
	ON CONFLICT (id) DO UPDATE SET
		name = EXCLUDED.name,
		module_id = EXCLUDED.module_id,
		status_id = EXCLUDED.status_id,
		parent_id = EXCLUDED.parent_id,
		page_url = EXCLUDED.page_url,
		sequence_no = EXCLUDED.sequence_no`,
	`INSERT INTO user_group_page (user_group_id, page_id)
	SELECT DISTINCT ugp.user_group_id, 800016
	FROM user_group_page ugp
	WHERE ugp.page_id IN (910000, 800001, 800002, 800003, 800004, 800005, 800006, 800007, 800008, 120, 121, 122, 362, 363)
		AND NOT EXISTS (
			SELECT 1 FROM user_group_page x
			WHERE x.user_group_id = ugp.user_group_id AND x.page_id = 800016
		)`
];

for (const q of statements) {
	await sql.query(q);
}

console.log('patch-ed-registration-nav-cleanup: ok');
