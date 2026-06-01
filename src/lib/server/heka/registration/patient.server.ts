import { error, type RequestEvent } from '@sveltejs/kit';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum, YesNoEnum } from '$lib/model/enum/db-link';
import {
	normalizePagination,
	type PaginatedResult,
	type PaginationParams
} from '$lib/model/type/pagination.type';
import {
	and,
	count,
	eq,
	ilike,
	ne,
	or,
	sql,
	desc
} from 'drizzle-orm';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';

const patientWithRelationsWith = {
	user: true,
	title: true,
	gender: true,
	identityType: true,
	status: true,
	phonePrimaryCountry: true,
	phoneSecondaryCountry: true,
	city: true,
	state: true,
	country: true
} as const;

export type PatientWithRelations = Awaited<
	ReturnType<typeof getPatientByIdWithRelations>
>;

export async function getPatientListPaginated(
	event: RequestEvent,
	params: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<NonNullable<PatientWithRelations>>> {
	const hospitalId = params.hospitalId;
	await ensureCanAccessHospital(event, hospitalId);

	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const searchTerm = params.search?.trim();
	const patientCode = params.patientCode?.trim();
	const patientName = params.patientName?.trim();
	const patientPhonePrimary = params.patientPhonePrimary?.trim();

	const conditions = [
		ne(table.patientTable.statusId, StatusEnum.DELETED),
		eq(table.patientTable.hospitalId, hospitalId)
	];

	if (searchTerm) {
		const pattern = `%${searchTerm}%`;
		const orExpr = or(
			ilike(
				sql`concat_ws(' ', ${table.patientTable.firstName}, ${table.patientTable.middleName}, ${table.patientTable.lastName})`,
				pattern
			),
			ilike(table.patientTable.code, pattern),
			ilike(table.patientTable.phonePrimary, pattern)
		);
		if (orExpr) {
			conditions.push(orExpr);
			conditions.push(
				ne(table.patientTable.nameMasking, YesNoEnum.YES)
			);
		}
	}

	if (patientCode) {
		conditions.push(
			ilike(table.patientTable.code, `%${patientCode}%`)
		);
	}
	if (patientName) {
		conditions.push(
			ilike(
				sql`concat_ws(' ', ${table.patientTable.firstName}, ${table.patientTable.middleName}, ${table.patientTable.lastName})`,
				`%${patientName}%`
			)
		);
		conditions.push(
			ne(table.patientTable.nameMasking, YesNoEnum.YES)
		);
	}
	if (patientPhonePrimary) {
		conditions.push(
			ilike(
				table.patientTable.phonePrimary,
				`%${patientPhonePrimary}%`
			)
		);
	}

	const whereExpr = and(...conditions);

	const [data, countResult] = await Promise.all([
		ensureDb().query.patientTable.findMany({
			where: whereExpr,
			with: patientWithRelationsWith,
			orderBy: (t, { desc }) => [desc(t.createdAt), desc(t.id)],
			limit,
			offset
		}),
		ensureDb()
			.select({ count: count() })
			.from(table.patientTable)
			.where(whereExpr)
	]);

	const total = countResult[0]?.count ?? 0;
	return {
		data,
		total,
		page,
		pageSize,
		totalPages: Math.ceil(total / pageSize) || 1
	};
}

export async function getPatientByIdWithRelations(
	event: RequestEvent,
	params: { hospitalId: string; id: string }
) {
	const hospitalId = params.hospitalId;
	await ensureCanAccessHospital(event, hospitalId);
	if (!params.id) throw error(400, 'Patient id is required');

	return ensureDb().query.patientTable.findFirst({
		where: and(
			eq(table.patientTable.id, params.id),
			eq(table.patientTable.hospitalId, hospitalId),
			ne(table.patientTable.statusId, StatusEnum.DELETED)
		),
		with: patientWithRelationsWith
	});
}

export async function deletePatient(
	event: RequestEvent,
	params: { hospitalId: string; id: string }
): Promise<void> {
	const hospitalId = params.hospitalId;
	await ensureCanAccessHospital(event, hospitalId);
	if (!params.id) throw error(400, 'Patient id is required');

	await ensureDb()
		.update(table.patientTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(
			and(
				eq(table.patientTable.id, params.id),
				eq(table.patientTable.hospitalId, hospitalId)
			)
		);
}
