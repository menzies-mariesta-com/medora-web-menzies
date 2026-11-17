/**
 * Idempotent tab order for the shared nursing chart: dashboard first, then the
 * chart tabs in workflow order. Keyed by `page_url` because seed ids (4001xx)
 * and older patch ids (8000xx) disagree, and the seed deletes the 8000xx rows.
 *
 * Also reparents the three hospital boards out of the chart strip:
 * Census → ADT (module 7), Track Board + Trauma Log → Emergency (module 12).
 *
 * Run: node --env-file=.env scripts/patch-nursing-chart-tab-order.mjs
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const sql = neon(url);

const ROOT = '/medora/home/nursing-workbench';

/** [slug, sequence_no] — the dashboard leads, boards are gone from this list. */
const TAB_ORDER = [
	['patient-visit-history-dashboard', 1],
	['vital', 2],
	['allergy', 3],
	['order', 4],
	['nursing-complete', 5],
	['case-sheet', 6],
	['clinical-document', 7],
	['patient-attachment', 8],
	['emar', 9],
	['care-plan', 10],
	['triage', 11],
	['mlc-documentation', 12]
];

/** Boards leave the chart strip: module id, null parent, sequence within the new module. */
const BOARD_MOVES = [
	['census', 7, 5],
	['track-board', 12, 3],
	['trauma-log', 12, 4]
];

const statements = [
	...TAB_ORDER.map(
		([slug, seq]) =>
			`UPDATE page
			SET sequence_no = ${seq}, updated_at = now()
			WHERE page_url = '${ROOT}/${slug}'`
	),
	...BOARD_MOVES.map(
		([slug, moduleId, seq]) =>
			`UPDATE page
			SET module_id = ${moduleId}, parent_id = NULL, sequence_no = ${seq}, updated_at = now()
			WHERE page_url = '${ROOT}/${slug}'`
	)
];

for (const q of statements) {
	await sql.query(q);
}

console.log('patch-nursing-chart-tab-order: ok');
