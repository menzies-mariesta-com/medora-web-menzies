/**
 * Idempotent nav patch: consolidate Nursing OPD / Nursing IPD / Nursing ED
 * into one Nursing page with shared chart sub-pages.
 *
 * Run: node --env-file=.env scripts/patch-nursing-module-nav.mjs
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const sql = neon(url);

const retiredPageIds = [
	8, 44, 481, 1900002, 1900003, 1900004, 1900005, 1900006, 1900007,
	1900008, 481002, 481003, 481004, 481005, 481006, 481007, 481008
];

export const statements = [
	`UPDATE module
	SET name = 'Nursing Workbench', updated_at = now()
	WHERE id = 4`,
	`INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
	VALUES
		(910000, 'Nursing Workbench', 4, 1, null, '/medora/home/nursing-workbench', 1),
		(800001, 'Vital', 4, 1, 910000, '/medora/home/nursing-workbench/vital', 1),
		(800002, 'Allergy', 4, 1, 910000, '/medora/home/nursing-workbench/allergy', 2),
		(800006, 'Patient Attachment', 4, 1, 910000, '/medora/home/nursing-workbench/patient-attachment', 3),
		(800005, 'Clinical Document', 4, 1, 910000, '/medora/home/nursing-workbench/clinical-document', 4),
		(800004, 'Case Sheet', 4, 1, 910000, '/medora/home/nursing-workbench/case-sheet', 5),
		(800007, 'Order', 4, 1, 910000, '/medora/home/nursing-workbench/order', 6),
		(800003, 'Nursing Complete', 4, 1, 910000, '/medora/home/nursing-workbench/nursing-complete', 7),
		(800008, 'Patient Visit History Dashboard', 4, 1, 910000, '/medora/home/nursing-workbench/patient-visit-history-dashboard', 8),
		(1900001, 'Census', 4, 1, 910000, '/medora/home/nursing-workbench/census', 9),
		(120, 'Track Board', 4, 1, 910000, '/medora/home/nursing-workbench/track-board', 10),
		(121, 'Triage', 4, 1, 910000, '/medora/home/nursing-workbench/triage', 11),
		(122, 'Trauma Log', 4, 1, 910000, '/medora/home/nursing-workbench/trauma-log', 12),
		(362, 'eMAR', 4, 1, 910000, '/medora/home/nursing-workbench/emar', 13),
		(363, 'Care plans', 4, 1, 910000, '/medora/home/nursing-workbench/care-plan', 14)
	ON CONFLICT (id) DO UPDATE SET
		name = EXCLUDED.name,
		module_id = EXCLUDED.module_id,
		status_id = EXCLUDED.status_id,
		parent_id = EXCLUDED.parent_id,
		page_url = EXCLUDED.page_url,
		sequence_no = EXCLUDED.sequence_no`,
	`INSERT INTO user_group_page (user_group_id, page_id)
	SELECT DISTINCT ugp.user_group_id, child.page_id
	FROM user_group_page ugp
	CROSS JOIN (
		VALUES
			(800001), (800002), (800006), (800005),
			(800004), (800007), (800003), (800008)
	) AS child(page_id)
	WHERE ugp.page_id IN (
			8, 44, 481, 910000,
			800001, 800002, 800003, 800004, 800005, 800006, 800007, 800008,
			1900001, 1900002, 1900003, 1900004, 1900005, 1900006, 1900007, 1900008,
			120, 121, 122,
			481002, 481003, 481004, 481005, 481006, 481007, 481008
	)
		AND NOT EXISTS (
			SELECT 1
			FROM user_group_page x
			WHERE x.user_group_id = ugp.user_group_id
				AND x.page_id = child.page_id
		)`,
	`INSERT INTO user_group_page (user_group_id, page_id)
	SELECT DISTINCT ugp.user_group_id, 1900001
	FROM user_group_page ugp
	WHERE ugp.page_id IN (
			44,
			1900001, 1900002, 1900003, 1900004,
			1900005, 1900006, 1900007, 1900008
		)
		AND NOT EXISTS (
			SELECT 1
			FROM user_group_page x
			WHERE x.user_group_id = ugp.user_group_id
				AND x.page_id = 1900001
		)`,
	`INSERT INTO user_group_page (user_group_id, page_id)
	SELECT DISTINCT ugp.user_group_id, child.page_id
	FROM user_group_page ugp
	CROSS JOIN (VALUES (120), (121), (122)) AS child(page_id)
	WHERE ugp.page_id IN (
			481,
			120, 121, 122,
			481002, 481003, 481004, 481005,
			481006, 481007, 481008
		)
		AND NOT EXISTS (
			SELECT 1
			FROM user_group_page x
			WHERE x.user_group_id = ugp.user_group_id
				AND x.page_id = child.page_id
		)`,
	`DELETE FROM user_group_page
	WHERE page_id IN (${retiredPageIds.join(', ')})`,
	`DELETE FROM page
	WHERE id IN (${retiredPageIds.join(', ')})`
];

export async function applyNursingModuleNavPatch() {
	for (const q of statements) {
		await sql.query(q);
	}

	const verify = await sql`
		SELECT id, name, module_id, parent_id, page_url, sequence_no
		FROM page
		WHERE id = 910000 OR parent_id = 910000
		ORDER BY sequence_no, id
	`;
	console.log('patch-nursing-module-nav: ok');
	console.table(verify);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
	await applyNursingModuleNavPatch();
}
