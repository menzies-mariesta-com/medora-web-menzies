/**
 * CLI: import RxNorm Full into Postgres.
 *
 * Prerequisites:
 *   DATABASE_URL
 *   UMLS / RxNorm terms for your organization
 *
 * Usage:
 *   pnpm db:import:rxnorm
 *   pnpm db:import:rxnorm -- --dry-run
 *   pnpm db:import:rxnorm -- --limit 5000
 *   pnpm db:import:rxnorm -- --use-cache
 *   pnpm db:import:rxnorm -- --all-tty
 *   pnpm db:import:rxnorm -- --include-ndc
 *   pnpm db:import:rxnorm -- --release-id 2026-01
 */

import {
	importRxnormFullCatalogue,
	RxnormImportError
} from '$lib/server/medora/clinical/rxnorm/rxnorm-full-import.server';

const args = process.argv.slice(2);

function flagValue(name: string, fallback: string | null = null): string | null {
	const idx = args.indexOf(name);
	if (idx === -1) return fallback;
	return args[idx + 1] ?? fallback;
}

const dryRun = args.includes('--dry-run');
const useCache = args.includes('--use-cache');
const allTty = args.includes('--all-tty');
const includeNdc = args.includes('--include-ndc');
const limit = Number(flagValue('--limit', '0') || '0');
const releaseId = flagValue('--release-id', null) ?? undefined;

async function main() {
	try {
		const result = await importRxnormFullCatalogue({
			dryRun,
			useCache,
			limit: limit > 0 ? limit : undefined,
			releaseId,
			prescribeOnly: !allTty,
			includeNdc,
			log: (m) => console.log(m)
		});
		console.log(JSON.stringify(result, null, 2));
	} catch (err) {
		if (err instanceof RxnormImportError) {
			console.error(err.message);
			process.exit(1);
		}
		throw err;
	}
}

main();
