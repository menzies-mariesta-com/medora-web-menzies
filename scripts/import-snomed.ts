/**
 * CLI: import SNOMED CT from licensed RF2 Snapshot files.
 *
 * Prerequisites:
 *   DATABASE_URL
 *   SNOMED_RF2_DIR — root folder of an International Edition Snapshot drop
 *
 * Usage:
 *   pnpm db:import:snomed
 *   pnpm db:import:snomed -- --dry-run
 *   pnpm db:import:snomed -- --limit 5000
 *   pnpm db:import:snomed -- --full
 *   pnpm db:import:snomed -- --rf2-dir /path/to/rf2
 */

import {
	importSnomedRf2Catalogue,
	SnomedRf2ImportError
} from '$lib/server/medora/clinical/snomed-rf2-import.server';

const args = process.argv.slice(2);

function flagValue(name: string, fallback: string | null = null): string | null {
	const idx = args.indexOf(name);
	if (idx === -1) return fallback;
	return args[idx + 1] ?? fallback;
}

const dryRun = args.includes('--dry-run');
const full = args.includes('--full');
const limit = Number(flagValue('--limit', '0') || '0');
const rf2Dir = flagValue('--rf2-dir', null) ?? undefined;
const releaseId = flagValue('--release-id', null) ?? undefined;

async function main() {
	try {
		const result = await importSnomedRf2Catalogue({
			dryRun,
			full,
			limit: limit > 0 ? limit : undefined,
			rf2Dir,
			releaseId,
			notesPrefix: 'Imported by scripts/import-snomed.ts',
			log: (m) => console.log(m)
		});
		console.log(JSON.stringify(result, null, 2));
	} catch (err) {
		if (err instanceof SnomedRf2ImportError) {
			console.error(err.message);
			process.exit(1);
		}
		throw err;
	}
}

main();
