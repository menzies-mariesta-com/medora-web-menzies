/**
 * CLI: openFDA label drug_interactions ETL.
 */

import { importOpenFdaInteractions } from '$lib/server/medora/clinical/rxnorm/openfda-interaction-etl.server';

const args = process.argv.slice(2);

function flagNum(name: string): number | undefined {
	const idx = args.indexOf(name);
	if (idx === -1) return undefined;
	return Number(args[idx + 1] || '0') || undefined;
}

async function main() {
	const result = await importOpenFdaInteractions({
		dryRun: args.includes('--dry-run'),
		limit: flagNum('--limit'),
		resumeSkip: flagNum('--resume-cursor'),
		log: (m) => console.log(m)
	});
	console.log(JSON.stringify(result, null, 2));
}

main();
