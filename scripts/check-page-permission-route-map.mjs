/**
 * Fails when the page-permission route map drifts from the filesystem/catalog.
 *
 * Checks:
 *  1. every `/api/medora/hospital/[hospital_id]/home/**\+server.ts` has an entry;
 *  2. every entry points at real `+page.svelte` route (or is selfService/homeWide);
 *  3. every action a route requires is offered by that page in the action catalog.
 *
 * Run: node scripts/check-page-permission-route-map.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const API_HOME = join(
	ROOT,
	'src/routes/api/(private)/medora/hospital/[hospital_id]/home'
);
const MAP_FILE = join(
	ROOT,
	'src/lib/server/medora/permission/page-permission-route-map.server.ts'
);
const CATALOG_FILE = join(
	ROOT,
	'src/lib/model/const/page-action-catalog.const.ts'
);
const SEED_FILE = join(
	ROOT,
	'src/lib/server/db/seed/init/information-table-seed.ts'
);

const errors = [];

/** Route keys present in the map file, plus whether they are page-scoped. */
function readMapKeys() {
	const src = readFileSync(MAP_FILE, 'utf8');
	const keys = new Map();
	const re = /^\t'([^']+)': ([\s\S]*?)(?=^\t'[^']+': |^\};)/gm;
	let match;
	while ((match = re.exec(src)) !== null) {
		const [, key, body] = match;
		keys.set(key, {
			selfService: body.includes('selfService: true'),
			homeWide: body.includes('homeWide: true'),
			pageUrls: [...body.matchAll(/'(\/medora\/home[^']*)'/g)].map(
				(m) => m[1]
			),
			actions: [...body.matchAll(/PageActionEnum\.([A-Z_]+)/g)].map(
				(m) => m[1].toLowerCase()
			)
		});
	}
	return keys;
}

/** Page URLs exposed by the action catalog (plus the CRUD default). */
function readCatalogPages() {
	return new Set(
		[...readFileSync(CATALOG_FILE, 'utf8').matchAll(/'(\/medora\/home[^']*)'/g)].map(
			(m) => m[1]
		)
	);
}

function walk(dir, predicate, out = []) {
	if (!existsSync(dir)) return out;
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) walk(full, predicate, out);
		else if (predicate(name)) out.push(full);
	}
	return out;
}

/** API route dirs that actually handle requests (a pure re-export still counts). */
const apiRoutes = walk(API_HOME, (n) => n === '+server.ts').map((file) => {
	const rel = relative(API_HOME, join(file, '..')).replaceAll('\\', '/');
	return rel === '' ? '/' : `/${rel}`;
});

const mapKeys = readMapKeys();
const catalogPages = readCatalogPages();

for (const route of apiRoutes.sort()) {
	if (!mapKeys.has(route)) {
		// Dynamic segments (`[entity]`) are map keys too; a request path only
		// matches them via `lookupRoutePermission`, so require the exact key here.
		errors.push(`Unmapped API route (fails closed for STAFF): ${route}`);
	}
}

// A `[param]` route must have its bracket template in the map, otherwise the
// gate can never resolve a real request to it.
const bracketRoutes = apiRoutes.filter((r) => /\[[^\]]+\]/.test(r));
for (const route of bracketRoutes) {
	if (!mapKeys.has(route)) {
		errors.push(
			`Dynamic route needs its bracket template as the map key: ${route}`
		);
	}
}

for (const key of mapKeys.keys()) {
	if (!apiRoutes.includes(key)) {
		errors.push(`Map entry has no +server.ts: ${key}`);
	}
}

const seedPageUrls = new Set(
	[
		...readFileSync(SEED_FILE, 'utf8').matchAll(
			/'(\/medora\/home(?:\/[^']*)?)'/g
		)
	].map((m) => m[1])
);

for (const [key, entry] of mapKeys) {
	if (entry.selfService || entry.homeWide) continue;
	if (entry.pageUrls.length === 0) {
		errors.push(`Map entry needs pageUrls (or selfService/homeWide): ${key}`);
		continue;
	}
	for (const pageUrl of entry.pageUrls) {
		// Seed is the source of truth: `(chart)` route groups make folder names differ.
		if (!seedPageUrls.has(pageUrl)) {
			errors.push(`${key}: page ${pageUrl} is missing from the page seed`);
		}
	}
	if (entry.actions.length === 0) {
		errors.push(`Map entry declares no action: ${key}`);
		continue;
	}
	for (const pageUrl of entry.pageUrls) {
		// Pages without a catalog entry fall back to the CRUD default.
		if (!catalogPages.has(pageUrl)) {
			const crudOnly = entry.actions.every((a) =>
				['view', 'create', 'edit', 'delete'].includes(a)
			);
			if (!crudOnly) {
				errors.push(
					`${key}: page ${pageUrl} has no catalog entry but needs [${entry.actions.join(', ')}]`
				);
			}
		}
	}
}

if (errors.length > 0) {
	console.error('page-permission route map is out of date:');
	for (const error of errors) console.error(`  - ${error}`);
	console.error(
		`\nFix ${MAP_FILE.replace(ROOT + '/', '')} (and the catalog for new actions).`
	);
	process.exit(1);
}

console.log(
	`page-permission route map OK: ${apiRoutes.length} hospital-home API routes mapped.`
);
