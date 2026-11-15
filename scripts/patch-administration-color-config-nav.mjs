/**
 * Idempotent page + grant patch for Administration → Color Configuration (page 100905).
 *
 * Run: node --env-file=.env scripts/patch-administration-color-config-nav.mjs
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const sql = neon(url);

const COLOR_PAGE_ID = 100905;
/** Groups with Prefix Configuration also get Color Configuration. */
const GRANT_SOURCE_PAGE_ID = 100900;

export const statements = [
	`INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
	VALUES
		(${COLOR_PAGE_ID}, 'Color Configuration', 1, 1, null, '/medora/home/administration/color-configuration', 10)
	ON CONFLICT (id) DO UPDATE SET
		name = EXCLUDED.name,
		module_id = EXCLUDED.module_id,
		status_id = EXCLUDED.status_id,
		parent_id = EXCLUDED.parent_id,
		page_url = EXCLUDED.page_url,
		sequence_no = EXCLUDED.sequence_no`,
	`INSERT INTO user_group_page (user_group_id, page_id)
	SELECT ugp.user_group_id, ${COLOR_PAGE_ID}
	FROM user_group_page ugp
	WHERE ugp.page_id = ${GRANT_SOURCE_PAGE_ID}
		AND NOT EXISTS (
			SELECT 1
			FROM user_group_page x
			WHERE x.user_group_id = ugp.user_group_id
				AND x.page_id = ${COLOR_PAGE_ID}
		)`
];

export async function applyAdministrationColorConfigNavPatch() {
	for (const q of statements) {
		await sql.query(q);
	}
	const verify = await sql`
		SELECT id, name, page_url, sequence_no
		FROM page
		WHERE id = ${COLOR_PAGE_ID}
	`;
	const grantCount = await sql`
		SELECT count(*)::int AS c
		FROM user_group_page
		WHERE page_id = ${COLOR_PAGE_ID}
	`;
	console.log('patch-administration-color-config-nav: ok');
	console.table(verify);
	console.log('user_group_page grants:', grantCount[0]?.c ?? 0);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
	await applyAdministrationColorConfigNavPatch();
}