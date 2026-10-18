/**
 * Idempotent page + grant patch for Nursing ED, ER Billing, Emergency nav cleanup.
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
	// Nursing ED tree (module 4)
	`INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
	VALUES
		(481, 'Nursing ED', 4, 1, null, '/medora/home/nursing-workbench/ed', 3),
		(120, 'Track Board', 4, 1, 481, '/medora/home/nursing-workbench/ed/track-board', 1),
		(481002, 'Vital', 4, 1, 481, '/medora/home/nursing-workbench/ed/vital', 2),
		(481003, 'Allergy', 4, 1, 481, '/medora/home/nursing-workbench/ed/allergy', 3),
		(481004, 'Patient Attachment', 4, 1, 481, '/medora/home/nursing-workbench/ed/patient-attachment', 4),
		(481005, 'Clinical Document', 4, 1, 481, '/medora/home/nursing-workbench/ed/clinical-document', 5),
		(481006, 'Case Sheet', 4, 1, 481, '/medora/home/nursing-workbench/ed/case-sheet', 6),
		(481007, 'Order', 4, 1, 481, '/medora/home/nursing-workbench/ed/order', 7),
		(481008, 'Nursing Complete', 4, 1, 481, '/medora/home/nursing-workbench/ed/nursing-complete', 8),
		(121, 'Triage', 4, 1, 481, '/medora/home/nursing-workbench/ed/triage', 9),
		(122, 'Trauma Log', 4, 1, 481, '/medora/home/nursing-workbench/ed/trauma-log', 10)
	ON CONFLICT (id) DO UPDATE SET
		name = EXCLUDED.name,
		module_id = EXCLUDED.module_id,
		status_id = EXCLUDED.status_id,
		parent_id = EXCLUDED.parent_id,
		page_url = EXCLUDED.page_url,
		sequence_no = EXCLUDED.sequence_no`,
	// Emergency: purchase item + bed status order; remove stray emergency URLs on moved ids
	`INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
	VALUES
		(125, 'Purchase item', 12, 1, null, '/medora/home/emergency/purchase-item', 2),
		(124, 'ER Bed Status', 12, 1, null, '/medora/home/emergency/bed-status', 5)
	ON CONFLICT (id) DO UPDATE SET
		name = EXCLUDED.name,
		module_id = EXCLUDED.module_id,
		status_id = EXCLUDED.status_id,
		parent_id = EXCLUDED.parent_id,
		page_url = EXCLUDED.page_url,
		sequence_no = EXCLUDED.sequence_no`,
	// Billing: ER Billing
	`INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
	VALUES (150004, 'ER Billing', 8, 1, null, '/medora/home/billing/er-billing', 3)
	ON CONFLICT (id) DO UPDATE SET
		name = EXCLUDED.name,
		module_id = EXCLUDED.module_id,
		status_id = EXCLUDED.status_id,
		parent_id = EXCLUDED.parent_id,
		page_url = EXCLUDED.page_url,
		sequence_no = EXCLUDED.sequence_no`,
	// Grants: Nursing ED pages for groups with OPD (8), IPD (44), or legacy ED pages
	`INSERT INTO user_group_page (user_group_id, page_id)
	SELECT ugp.user_group_id, child.page_id
	FROM user_group_page ugp
	CROSS JOIN (
		VALUES
			(481), (120), (481002), (481003), (481004), (481005), (481006), (481007), (481008), (121), (122)
	) AS child(page_id)
	WHERE ugp.page_id IN (8, 44, 481, 120, 121, 122)
		AND NOT EXISTS (
			SELECT 1 FROM user_group_page x
			WHERE x.user_group_id = ugp.user_group_id AND x.page_id = child.page_id
		)`,
	// Grants: ER Billing for OP billing (15) or IP billing parent (150001)
	`INSERT INTO user_group_page (user_group_id, page_id)
	SELECT ugp.user_group_id, 150004
	FROM user_group_page ugp
	WHERE ugp.page_id IN (15, 150001, 150004)
		AND NOT EXISTS (
			SELECT 1 FROM user_group_page x
			WHERE x.user_group_id = ugp.user_group_id AND x.page_id = 150004
		)`,
	// Grants: Purchase item for emergency registration (123) or legacy track/triage
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
	WHERE id IN (481, 120, 121, 122, 150004, 125) OR parent_id = 481
	ORDER BY id
`;
console.log('patch-nursing-ed-nav-pages: ok');
console.table(verify);
