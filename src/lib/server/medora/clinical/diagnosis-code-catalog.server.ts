import { and, asc, count, eq, ilike, or } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	DiagnosisCodingSystemEnum,
	parseDiagnosisCodingSystem
} from '$lib/model/enum/diagnosis-coding-system.enum';
import type { DiagnosisCodeOption } from '$lib/model/type/medora/clinical.type';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	getHospitalCodingSystem,
	getLatestDiagnosisCodeRelease
} from '$lib/server/medora/clinical/diagnosis-code.server';

export type DiagnosisCodeCatalogMeta = {
	codingSystem: string;
	release: {
		system: string;
		releaseId: string;
		titleCount: number;
		importedAt: string;
	} | null;
	attribution: 'WHO_ICD' | 'CDC_ICD10_CM';
};

export async function getHospitalDiagnosisCatalogMeta(
	hospitalId: string
): Promise<DiagnosisCodeCatalogMeta> {
	const codingSystem = await getHospitalCodingSystem(hospitalId);
	const release = await getLatestDiagnosisCodeRelease(codingSystem);
	return {
		codingSystem,
		release: release
			? {
					system: release.system,
					releaseId: release.releaseId,
					titleCount: release.titleCount,
					importedAt: String(release.importedAt)
				}
			: null,
		attribution:
			codingSystem === DiagnosisCodingSystemEnum.ICD10_CM
				? 'CDC_ICD10_CM'
				: 'WHO_ICD'
	};
}

/** Read-only catalog browse for the hospital's bound coding system. */
export async function listHospitalDiagnosisCodes(input: {
	hospitalId: string;
	search?: string;
	page?: number;
	pageSize?: number;
}): Promise<{
	data: DiagnosisCodeOption[];
	total: number;
	page: number;
	pageSize: number;
}> {
	const codingSystem = await getHospitalCodingSystem(input.hospitalId);
	const page = Math.max(1, input.page ?? 1);
	const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
	const offset = (page - 1) * pageSize;
	const query = input.search?.trim();
	const filter = query
		? and(
				eq(table.diagnosisCodeTable.statusId, StatusEnum.ACTIVE),
				eq(table.diagnosisCodeTable.system, codingSystem),
				or(
					ilike(table.diagnosisCodeTable.code, `%${query}%`),
					ilike(table.diagnosisCodeTable.description, `%${query}%`)
				)
			)
		: and(
				eq(table.diagnosisCodeTable.statusId, StatusEnum.ACTIVE),
				eq(table.diagnosisCodeTable.system, codingSystem)
			);

	const db = ensureDb();
	const [data, countRow] = await Promise.all([
		db
			.select({
				id: table.diagnosisCodeTable.id,
				code: table.diagnosisCodeTable.code,
				system: table.diagnosisCodeTable.system,
				description: table.diagnosisCodeTable.description
			})
			.from(table.diagnosisCodeTable)
			.where(filter)
			.orderBy(asc(table.diagnosisCodeTable.code))
			.limit(pageSize)
			.offset(offset),
		db
			.select({ count: count() })
			.from(table.diagnosisCodeTable)
			.where(filter)
	]);

	return {
		data,
		total: Number(countRow[0]?.count ?? 0),
		page,
		pageSize
	};
}

export function defaultCodingSystemLabel(system: string): string {
	const parsed = parseDiagnosisCodingSystem(
		system,
		DiagnosisCodingSystemEnum.ICD10
	);
	if (parsed === DiagnosisCodingSystemEnum.ICD11) {
		return 'ICD-11 MMS (WHO)';
	}
	if (parsed === DiagnosisCodingSystemEnum.ICD10_CM) {
		return 'ICD-10-CM (US)';
	}
	return 'ICD-10 (WHO)';
}
