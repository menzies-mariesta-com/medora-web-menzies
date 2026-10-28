/**
 * Idempotent nav patch: consolidate Nursing OPD / Nursing IPD / Nursing ED
 * (plus eMAR and Care plans) under one "Nursing" page.
 * Run: node --env-file=.env scripts/patch-nursing-module-nav.mjs
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const sql = neon(url);

const statements = [
	`UPDATE module
	SET name = 'Nursing', updated_at = now()
	WHERE id = 4`,
	`INSERT INTO page (id, name, module_id, status_id, parent_id, page_url, sequence_no)
	VALUES (910000, 'Nursing', 4, 1, null, '/medora/home/nursing-workbench', 1)
	ON CONFLICT (id) DO UPDATE SET
		name = EXCLUDED.name,
		module_id = EXCLUDED.module_id,
		status_id = EXCLUDED.status_id,
		parent_id = EXCLUDED.parent_id,
		page_url = EXCLUDED.page_url,
		sequence_no = EXCLUDED.sequence_no`,
	`UPDATE page SET parent_id = 910000 WHERE id IN (8, 44, 481, 362, 363)`,
	`UPDATE page SET sequence_no = 1 WHERE id = 8`,
	`UPDATE page SET sequence_no = 2 WHERE id = 44`,
	`UPDATE page SET sequence_no = 3 WHERE id = 481`,
	`UPDATE page SET sequence_no = 4 WHERE id = 362`,
	`UPDATE page SET sequence_no = 5 WHERE id = 363`
];

for (const q of statements) {
	await sql.query(q);
}

const verify = await sql`
	SELECT id, name, module_id, parent_id, page_url, sequence_no
	FROM page
	WHERE id IN (910000, 8, 44, 481, 362, 363)
	ORDER BY sequence_no, id
`;
console.log('patch-nursing-module-nav: ok');
console.table(verify);
