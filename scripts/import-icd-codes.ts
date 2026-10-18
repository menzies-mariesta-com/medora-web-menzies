/**
 * CLI entry for ICD catalogue import.
 *
 * Catalogues (stored separately in diagnosis_code.system):
 *   ICD10     - WHO ICD-10 (WHO ICD-API)
 *   ICD11     - WHO ICD-11 MMS (WHO ICD-API)
 *   ICD10_CM  - US ICD-10-CM (CDC/NCHS code descriptions ZIP)
 *
 * Prerequisites (WHO systems):
 *   WHO_ICD_CLIENT_ID, WHO_ICD_CLIENT_SECRET, DATABASE_URL
 *
 * Prerequisites (ICD10_CM):
 *   DATABASE_URL
 *   Optional: ICD10_CM_ZIP_URL, ICD10_CM_RELEASE_ID
 *
 * Usage:
 *   pnpm db:import:icd
 *   pnpm db:import:icd -- --system ICD10
 *   pnpm db:import:icd -- --system ICD11
 *   pnpm db:import:icd -- --system ICD10_CM
 *   pnpm db:import:icd -- --system WHO
 *   pnpm db:import:icd -- --system ALL
 *   pnpm db:import:icd -- --system ICD10 --dry-run
 *   pnpm db:import:icd -- --limit 500
 */

import {
	DiagnosisCodingSystemEnum,
	isWhoDiagnosisCodingSystem
} from '$lib/model/enum/diagnosis-coding-system.enum';
import {
	importIcd10CmCatalogue,
	Icd10CmImportError
} from '$lib/server/medora/clinical/icd10-cm-import.server';
import {
	importWhoIcdSystems,
	WhoIcdCredentialsError,
	WhoIcdDatabaseUrlError,
	type WhoIcdSystem
} from '$lib/server/medora/clinical/who-icd-import.server';

const args = process.argv.slice(2);

function flagValue(name: string, fallback: string | null = null): string | null {
	const idx = args.indexOf(name);
	if (idx === -1) return fallback;
	return args[idx + 1] ?? fallback;
}

const dryRun = args.includes('--dry-run');
const systemArg = (flagValue('--system', 'WHO') || 'WHO').toUpperCase();
const hardLimit = Number(flagValue('--limit', '0') || '0');

type ImportTarget =
	| { kind: 'who'; systems: WhoIcdSystem[] | 'BOTH' }
	| { kind: 'cm' }
	| { kind: 'all' };

function resolveTarget(): ImportTarget {
	if (systemArg === 'WHO' || systemArg === 'BOTH') {
		return { kind: 'who', systems: 'BOTH' };
	}
	if (systemArg === 'ALL') {
		return { kind: 'all' };
	}
	if (systemArg === DiagnosisCodingSystemEnum.ICD10_CM) {
		return { kind: 'cm' };
	}
	if (isWhoDiagnosisCodingSystem(systemArg)) {
		return { kind: 'who', systems: [systemArg] };
	}
	console.error(
		'--system must be ICD10, ICD11, ICD10_CM, WHO, BOTH, or ALL'
	);
	process.exit(1);
}

async function runWho(systems: WhoIcdSystem[] | 'BOTH') {
	await importWhoIcdSystems({
		systems,
		limit: hardLimit,
		dryRun,
		notesPrefix: 'Imported by scripts/import-icd-codes.ts',
		log: (m) => console.log(m)
	});
}

async function runCm() {
	await importIcd10CmCatalogue({
		limit: hardLimit,
		dryRun,
		notesPrefix: 'Imported by scripts/import-icd-codes.ts',
		log: (m) => console.log(m)
	});
}

async function main() {
	const target = resolveTarget();
	if (target.kind === 'who') {
		await runWho(target.systems);
		return;
	}
	if (target.kind === 'cm') {
		await runCm();
		return;
	}
	await runWho('BOTH');
	await runCm();
}

main().catch((err) => {
	if (
		err instanceof WhoIcdCredentialsError ||
		err instanceof WhoIcdDatabaseUrlError ||
		err instanceof Icd10CmImportError
	) {
		console.error(err.message);
	} else {
		console.error(err);
	}
	process.exit(1);
});
