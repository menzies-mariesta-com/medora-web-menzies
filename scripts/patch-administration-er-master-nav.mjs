/**
 * Retire ER Ward / Room / Bed Master nav; grants move to Ward / Room / Bed Master.
 *
 * Run: node --env-file=.env scripts/patch-administration-er-master-nav.mjs
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const sql = neon(url);

const retiredPageIds = [451, 451001, 451002, 452, 452001, 452002, 453];

export const statements = [
	`INSERT INTO user_group_page (user_group_id, page_id)
	SELECT DISTINCT ugp.user_group_id, child.page_id
	FROM user_group_page ugp
	CROSS JOIN (
		VALUES (45), (450001), (450002), (47), (470001), (470002), (46)
	) AS child(page_id)
	WHERE ugp.page_id IN (${retiredPageIds.join(', ')})
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

export async function applyAdministrationErMasterNavPatch() {
	for (const q of statements) {
		await sql.query(q);
	}
	console.log('patch-administration-er-master-nav: ok');
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
	await applyAdministrationErMasterNavPatch();
}
