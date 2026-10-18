import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, eq, ilike, or, sql } from 'drizzle-orm';
import { AdminPageKeyEnum, RoleEnum } from '$lib/model/enum/db-link';
import {
	DiagnosisCodingSystemEnum,
	isDiagnosisCodingSystem,
	isWhoDiagnosisCodingSystem,
	type DiagnosisCodingSystem
} from '$lib/model/enum/diagnosis-coding-system.enum';
import type {
	AdminIcdCodeRow,
	AdminIcdListResponse,
	AdminIcdReleaseSummary,
	AdminIcdReseedResponse,
	AdminIcdSystemTotals
} from '$lib/model/type/medora/admin-icd.type';
import {
	normalizePagination,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
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
import { requireAdminPagePermission } from './admin-permission.server';

function toIso(value: string | Date | null | undefined): string | null {
	if (!value) return null;
	if (value instanceof Date) return value.toISOString();
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

async function assertIcdView(event: RequestEvent) {
	await requireAdminPagePermission(event, AdminPageKeyEnum.ICD, 'view');
}

/**
 * Reseed is SYSTEM_ADMIN only (long-running catalogue write).
 * OWNER is not in the admin shell.
 */
async function assertIcdReseed(event: RequestEvent) {
	if (!event.locals.user) throw error(401, 'Unauthorized');
	const roleId = event.locals.userRoleId ?? null;
	if (roleId !== RoleEnum.SYSTEM_ADMIN) {
		throw error(403, 'Only system admin can reseed ICD codes');
	}
}

function parseSystemFilter(
	value: string | null | undefined
): DiagnosisCodingSystem | null {
	if (!value || value === 'ALL' || value === 'BOTH' || value === 'WHO') {
		return null;
	}
	if (!isDiagnosisCodingSystem(value)) {
		throw error(
			400,
			'system must be ICD10, ICD10_CM, ICD11, WHO, or ALL'
		);
	}
	return value;
}

function emptySystemTotals(): AdminIcdSystemTotals {
	return {
		[DiagnosisCodingSystemEnum.ICD10]: 0,
		[DiagnosisCodingSystemEnum.ICD10_CM]: 0,
		[DiagnosisCodingSystemEnum.ICD11]: 0
	};
}

export async function getAdminIcdCodesPaginated(
	event: RequestEvent,
	params: PaginationParams & {
		system?: string | null;
		code?: string | null;
		description?: string | null;
		search?: string | null;
		statusId?: number | null;
	}
): Promise<AdminIcdListResponse> {
	await assertIcdView(event);
	const db = ensureDb();
	const { page, pageSize, limit, offset } = normalizePagination(params);
	const system = parseSystemFilter(params.system);

	const filters = [];
	if (system) {
		filters.push(eq(table.diagnosisCodeTable.system, system));
	}

	const statusId =
		typeof params.statusId === 'number' && Number.isFinite(params.statusId)
			? params.statusId
			: null;
	if (statusId != null) {
		filters.push(eq(table.diagnosisCodeTable.statusId, statusId));
	}

	const codeTerm = params.code?.trim();
	if (codeTerm) {
		filters.push(ilike(table.diagnosisCodeTable.code, `%${codeTerm}%`));
	}

	const descriptionTerm = params.description?.trim();
	if (descriptionTerm) {
		filters.push(
			ilike(table.diagnosisCodeTable.description, `%${descriptionTerm}%`)
		);
	}

	const searchTerm = params.search?.trim();
	if (searchTerm && !codeTerm && !descriptionTerm) {
		filters.push(
			or(
				ilike(table.diagnosisCodeTable.code, `%${searchTerm}%`),
				ilike(table.diagnosisCodeTable.description, `%${searchTerm}%`)
			)!
		);
	}

	const whereExpr = filters.length > 0 ? and(...filters) : undefined;

	const [rows, countRows, systemCountRows, releaseRows] = await Promise.all([
		db
			.select({
				id: table.diagnosisCodeTable.id,
				code: table.diagnosisCodeTable.code,
				system: table.diagnosisCodeTable.system,
				description: table.diagnosisCodeTable.description,
				releaseId: table.diagnosisCodeTable.releaseId,
				statusId: table.diagnosisCodeTable.statusId,
				createdAt: table.diagnosisCodeTable.createdAt,
				updatedAt: table.diagnosisCodeTable.updatedAt
			})
			.from(table.diagnosisCodeTable)
			.where(whereExpr)
			.orderBy(
				table.diagnosisCodeTable.system,
				table.diagnosisCodeTable.code
			)
			.limit(limit)
			.offset(offset),
		db
			.select({ count: count() })
			.from(table.diagnosisCodeTable)
			.where(whereExpr),
		db
			.select({
				system: table.diagnosisCodeTable.system,
				count: count()
			})
			.from(table.diagnosisCodeTable)
			.groupBy(table.diagnosisCodeTable.system),
		db
			.select({
				system: table.diagnosisCodeReleaseTable.system,
				releaseId: table.diagnosisCodeReleaseTable.releaseId,
				source: table.diagnosisCodeReleaseTable.source,
				titleCount: table.diagnosisCodeReleaseTable.titleCount,
				importedAt: table.diagnosisCodeReleaseTable.importedAt
			})
			.from(table.diagnosisCodeReleaseTable)
			.orderBy(
				table.diagnosisCodeReleaseTable.system,
				sql`${table.diagnosisCodeReleaseTable.importedAt} desc`
			)
	]);

	const total = Number(countRows[0]?.count ?? 0);
	const data: AdminIcdCodeRow[] = rows.map((row) => ({
		id: row.id,
		code: row.code,
		system: row.system,
		description: row.description,
		releaseId: row.releaseId,
		statusId: row.statusId,
		createdAt: toIso(row.createdAt),
		updatedAt: toIso(row.updatedAt)
	}));

	const systemTotals = emptySystemTotals();
	for (const row of systemCountRows) {
		if (isDiagnosisCodingSystem(row.system)) {
			systemTotals[row.system] = Number(row.count ?? 0);
		}
	}

	const latestBySystem = new Map<string, AdminIcdReleaseSummary>();
	for (const row of releaseRows) {
		if (latestBySystem.has(row.system)) continue;
		latestBySystem.set(row.system, {
			system: row.system,
			releaseId: row.releaseId,
			source: row.source,
			titleCount: row.titleCount,
			importedAt: toIso(row.importedAt)
		});
	}

	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1,
		system: system ?? 'ALL',
		systemTotals,
		latestReleases: [...latestBySystem.values()]
	};
}

function emptyReseed(): AdminIcdReseedResponse {
	return { systems: [], inserted: 0, updated: 0, total: 0 };
}

function mergeReseed(
	a: AdminIcdReseedResponse,
	b: AdminIcdReseedResponse
): AdminIcdReseedResponse {
	return {
		systems: [...a.systems, ...b.systems],
		inserted: a.inserted + b.inserted,
		updated: a.updated + b.updated,
		total: a.total + b.total
	};
}

async function reseedWho(
	systems: WhoIcdSystem[] | 'BOTH'
): Promise<AdminIcdReseedResponse> {
	const result = await importWhoIcdSystems({
		systems,
		notesPrefix: 'Admin ICD reseed (WHO ICD-API)',
		log: (m) => console.info(`[admin-icd-reseed] ${m}`)
	});
	return {
		systems: result.systems.map((s) => ({
			system: s.system,
			inserted: s.inserted,
			updated: s.updated,
			total: s.total
		})),
		inserted: result.inserted,
		updated: result.updated,
		total: result.total
	};
}

async function reseedCm(): Promise<AdminIcdReseedResponse> {
	const result = await importIcd10CmCatalogue({
		notesPrefix: 'Admin ICD reseed (CDC ICD-10-CM)',
		log: (m) => console.info(`[admin-icd-reseed] ${m}`)
	});
	return {
		systems: [
			{
				system: result.system,
				inserted: result.inserted,
				updated: result.updated,
				total: result.total
			}
		],
		inserted: result.inserted,
		updated: result.updated,
		total: result.total
	};
}

/**
 * Catalogue reseed for the active admin tab (or all WHO + CM when system omitted).
 * Upsert by (system, code); does not truncate. Diagnosis FKs stay intact.
 */
export async function reseedAdminIcdCodes(
	event: RequestEvent,
	input?: { system?: string | null }
): Promise<AdminIcdReseedResponse> {
	await assertIcdReseed(event);
	const system = parseSystemFilter(input?.system);

	try {
		if (system === DiagnosisCodingSystemEnum.ICD10_CM) {
			return await reseedCm();
		}
		if (system && isWhoDiagnosisCodingSystem(system)) {
			return await reseedWho([system]);
		}
		// ALL / omitted: WHO ICD-10 + ICD-11, then CDC ICD-10-CM
		let result = emptyReseed();
		result = mergeReseed(result, await reseedWho('BOTH'));
		result = mergeReseed(result, await reseedCm());
		return result;
	} catch (err) {
		if (err instanceof WhoIcdCredentialsError) {
			throw error(503, err.message);
		}
		if (err instanceof WhoIcdDatabaseUrlError) {
			throw error(503, err.message);
		}
		if (err instanceof Icd10CmImportError) {
			throw error(502, err.message);
		}
		const message =
			err instanceof Error
				? err.message
				: 'Could not import ICD codes';
		throw error(502, message);
	}
}
