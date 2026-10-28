/**
 * Idempotent page + grant patch for ER Billing, Emergency nav, and ER masters.
 *
 * Nursing ED is no longer a separate nav group. The nursing tree is
 * consolidated by `scripts/patch-nursing-module-nav.mjs`; this script must not
 * recreate the retired Nursing ED pages.
 *
 * Run: node --env-file=.env scripts/patch-nursing-ed-nav-pages.mjs
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const sql = neon(url);

const statements = [
	`INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
	VALUES
		(124, 'ED Bed Status', 12, 1, null, '/medora/home/emergency/bed-status', 5),
		(454, 'ED triage levels', 1, 1, null, '/medora/home/administration/er-triage-level', 19),
		(455, 'ED billing setup', 1, 1, null, '/medora/home/administration/er-billing-setup', 20),
		(125, 'Purchase item', 12, 1, null, '/medora/home/emergency/purchase-item', 2)
	ON CONFLICT (id) DO UPDATE SET
		name = EXCLUDED.name,
		module_id = EXCLUDED.module_id,
		status_id = EXCLUDED.status_id,
		parent_id = EXCLUDED.parent_id,
		page_url = EXCLUDED.page_url,
		sequence_no = EXCLUDED.sequence_no`,
	`UPDATE page SET name = 'ED Patient Registration', sequence_no = 1 WHERE id = 123001`,
	`UPDATE page SET sequence_no = 2 WHERE id = 124`,
	`INSERT INTO user_group_page (user_group_id, page_id)
	SELECT ugp.user_group_id, child.page_id
	FROM user_group_page ugp
	CROSS JOIN (
		VALUES (124), (454)
	) AS child(page_id)
	WHERE ugp.page_id IN (45, 46, 47, 120, 121, 122)
		AND NOT EXISTS (
			SELECT 1
			FROM user_group_page x
			WHERE x.user_group_id = ugp.user_group_id
				AND x.page_id = child.page_id
		)`,
	`INSERT INTO user_group_page (user_group_id, page_id)
	SELECT ugp.user_group_id, 125
	FROM user_group_page ugp
	WHERE ugp.page_id IN (123, 120, 121, 122, 124, 125)
		AND NOT EXISTS (
			SELECT 1 FROM user_group_page x
			WHERE x.user_group_id = ugp.user_group_id AND x.page_id = 125
		)`
];

for (const q of statements) {
	await sql.query(q);
}

const verify = await sql`
	SELECT id, name, module_id, parent_id, page_url
	FROM page
	WHERE id IN (120, 121, 122, 125) OR parent_id = 910000
	ORDER BY id
`;
console.log('patch-nursing-ed-nav-pages: ok');
console.table(verify);
