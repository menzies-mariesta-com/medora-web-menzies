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
		(451, 'ER Ward Master', 1, 1, null, '/medora/home/administration/er-ward-master', 16),
		(451001, 'ER Ward Category', 1, 1, 451, '/medora/home/administration/er-ward-master/ward-category', 1),
		(451002, 'ER Ward', 1, 1, 451, '/medora/home/administration/er-ward-master/ward', 2),
		(452, 'ER Room Master', 1, 1, null, '/medora/home/administration/er-room-master', 17),
		(452001, 'ER Room Category', 1, 1, 452, '/medora/home/administration/er-room-master/room-category', 1),
		(452002, 'ER Room', 1, 1, 452, '/medora/home/administration/er-room-master/room', 2),
		(453, 'ER Bed Master', 1, 1, null, '/medora/home/administration/er-bed-master', 18),
		(124, 'ER Bed Status', 12, 1, null, '/medora/home/emergency/bed-status', 5),
		(454, 'ER Triage Levels', 1, 1, null, '/medora/home/administration/er-triage-level', 19),
		(455, 'ER Billing Setup', 1, 1, null, '/medora/home/administration/er-billing-setup', 20),
		(125, 'Purchase item', 12, 1, null, '/medora/home/emergency/purchase-item', 2),
		(150004, 'ER Billing', 8, 1, null, '/medora/home/billing/er-billing', 3)
	ON CONFLICT (id) DO UPDATE SET
		name = EXCLUDED.name,
		module_id = EXCLUDED.module_id,
		status_id = EXCLUDED.status_id,
		parent_id = EXCLUDED.parent_id,
		page_url = EXCLUDED.page_url,
		sequence_no = EXCLUDED.sequence_no`,
	`UPDATE page SET sequence_no = 2 WHERE id = 124`,
	`INSERT INTO user_group_page (user_group_id, page_id)
	SELECT ugp.user_group_id, child.page_id
	FROM user_group_page ugp
	CROSS JOIN (
		VALUES (451), (451001), (451002), (452), (452001), (452002), (453), (124), (454)
	) AS child(page_id)
	WHERE ugp.page_id IN (45, 46, 47, 120, 121, 122)
		AND NOT EXISTS (
			SELECT 1
			FROM user_group_page x
			WHERE x.user_group_id = ugp.user_group_id
				AND x.page_id = child.page_id
		)`,
	`INSERT INTO user_group_page (user_group_id, page_id)
	SELECT ugp.user_group_id, 150004
	FROM user_group_page ugp
	WHERE ugp.page_id IN (15, 150001, 150004)
		AND NOT EXISTS (
			SELECT 1 FROM user_group_page x
			WHERE x.user_group_id = ugp.user_group_id AND x.page_id = 150004
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
	WHERE id IN (120, 121, 122, 150004, 125) OR parent_id = 910000
	ORDER BY id
`;
console.log('patch-nursing-ed-nav-pages: ok');
console.table(verify);
