/**
 * Global lookup lists (SearchSelect geo/title/etc.) must be ACTIVE-only.
 */
import { readFileSync } from 'node:fs';

const file = 'src/lib/server/medora/master/lookup-lists.server.ts';
const text = readFileSync(file, 'utf8');

if (!text.includes('activeEntityStatusEq')) {
	console.error('check:select-options-active-only failed: lookup-lists missing activeEntityStatusEq');
	process.exit(1);
}

if (/ne\([^)]*statusId[^)]*StatusEnum\.DELETED/.test(text)) {
	console.error(
		'check:select-options-active-only failed: lookup-lists still filters with ne(DELETED) instead of ACTIVE'
	);
	process.exit(1);
}

console.log('check:select-options-active-only: ok');
