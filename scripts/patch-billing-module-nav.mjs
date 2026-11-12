/**
 * Idempotent nav patch: Bill + Advance Deposit only under Billing module (top-level pages).
 * Page ids: 800100 Bill, 800200 Advance Deposit.
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

const BILL_PAGE_ID = 800100;
const BILL_ADVANCE_PAGE_ID = 800200;
const retiredPageIds = [
	15,
	150001,
	150004,
	150000,
	150003,
	150002,
	800000,
	810001,
	810002
];

export const statements = [
	`UPDATE module
	SET module_url = '/medora/home/billing/bill', updated_at = now()
	WHERE id = 8`,
	`INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
	VALUES
		(${BILL_PAGE_ID}, 'Bill', 8, 1, null, '/medora/home/billing/bill', 1),
		(${BILL_ADVANCE_PAGE_ID}, 'Advance Deposit', 8, 1, null, '/medora/home/billing/advance-deposit', 2)
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
	CROSS JOIN (VALUES (${BILL_PAGE_ID}), (${BILL_ADVANCE_PAGE_ID})) AS child(page_id)
	WHERE ugp.page_id IN (15, 150001, ${BILL_PAGE_ID}, 150004, ${BILL_ADVANCE_PAGE_ID}, 150000, 150003, 150002, 810001, 810002)
		AND NOT EXISTS (
			SELECT 1
			FROM user_group_page x
			WHERE x.user_group_id = ugp.user_group_id
				AND x.page_id = child.page_id
		)`,
	`DELETE FROM user_group_page
	WHERE page_id IN (${retiredPageIds.filter((id) => id !== BILL_PAGE_ID && id !== BILL_ADVANCE_PAGE_ID).join(', ')})`,
	`DELETE FROM page
	WHERE id IN (${retiredPageIds.filter((id) => id !== BILL_PAGE_ID && id !== BILL_ADVANCE_PAGE_ID).join(', ')})`
];

export async function applyBillingModuleNavPatch() {
	for (const q of statements) {
		await sql.query(q);
	}

	const verify = await sql`
		SELECT id, name, module_id, parent_id, page_url, sequence_no
		FROM page
		WHERE module_id = 8 AND id IN (${BILL_ADVANCE_PAGE_ID}, ${BILL_PAGE_ID})
		ORDER BY sequence_no, id
	`;
	console.log('patch-billing-module-nav: ok');
	console.table(verify);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
	await applyBillingModuleNavPatch();
}
