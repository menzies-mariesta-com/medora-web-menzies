/**
 * CLI: DDInter interaction import.
 * Requires ALLOW_DDINTER_IMPORT=true (see docs/rxnorm-cds-licenses.md).
 */

import {
	importDdinterCatalogue,
	DdinterImportError
} from '$lib/server/medora/clinical/rxnorm/ddinter-import.server';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit =
	limitIdx >= 0 ? Number(args[limitIdx + 1] || '0') : undefined;

async function main() {
	try {
		const result = await importDdinterCatalogue({
			dryRun,
			limit: limit && limit > 0 ? limit : undefined,
			log: (m) => console.log(m)
		});
		console.log(JSON.stringify(result, null, 2));
	} catch (e) {
		if (e instanceof DdinterImportError) {
			console.error(e.message);
			process.exit(1);
		}
		throw e;
	}
}

main();
