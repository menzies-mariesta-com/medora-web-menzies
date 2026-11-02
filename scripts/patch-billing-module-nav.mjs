/**
 * Idempotent nav patch: one Bill page for OP/ER/IP billing + Advance Deposit child.
 *
 * Run: node --env-file=.env scripts/patch-billing-module-nav.mjs
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const sql = neon(url);

const retiredPageIds = [15, 150001, 150004];

export const statements = [
	`UPDATE module
	SET module_url = '/medora/home/billing/bill', updated_at = now()
	WHERE id = 8`,
	`INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
	VALUES
		(150003, 'Bill', 8, 1, null, '/medora/home/billing/bill', 1),
		(150002, 'Advance Deposit', 8, 1, 150003, '/medora/home/billing/ip-billing/advance-deposit', 2)
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
	CROSS JOIN (VALUES (150003), (150002)) AS child(page_id)
	WHERE ugp.page_id IN (15, 150001, 150003, 150004, 150002)
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

export async function applyBillingModuleNavPatch() {
	for (const q of statements) {
		await sql.query(q);
	}

	const verify = await sql`
		SELECT id, name, module_id, parent_id, page_url, sequence_no
		FROM page
		WHERE id = 150003 OR parent_id = 150003
		ORDER BY sequence_no, id
	`;
	console.log('patch-billing-module-nav: ok');
	console.table(verify);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
	await applyBillingModuleNavPatch();
}
