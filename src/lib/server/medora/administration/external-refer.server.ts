import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, eq, ilike, ne, or } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	ExternalReferSchema,
	ExternalReferSchemaInsert,
	ExternalReferSchemaUpdate
} from '$lib/server/db/schema-type';
import { StatusEnum } from '$lib/model/enum/db-link';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import { ensureCanAccessHospital } from '$lib/server/medora/ensure-can-access-hospital.server';

const externalReferWithRelationsWith = {
	referType: true,
	hospital: true,
	title: true,
	country: true,
	phoneCountry: true,
	state: true,
	city: true,
	postalCode: true,
	status: true
} as const;

export type ExternalReferWithRelations = Awaited<
	ReturnType<typeof getExternalReferByIdWithRelations>
>;

function requireUser(event: RequestEvent): void {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
}

export async function getExternalReferPaginated(
	event: RequestEvent,
	params: PaginationParams & { hospitalId: string }
): Promise<PaginatedResult<any>> {
	requireUser(event);
	await ensureCanAccessHospital(event, params.hospitalId);

	const { page, pageSize, limit, offset } =
		normalizePagination(params);
	const notDeletedCondition = ne(
		table.externalReferTable.statusId,
		StatusEnum.DELETED
	);

	const searchTerm = params.search?.trim();
	const pattern = searchTerm ? `%${searchTerm}%` : null;
	const searchCondition =
		pattern &&
		or(
			ilike(table.externalReferTable.name, pattern),
			ilike(table.externalReferTable.address, pattern),
			ilike(table.externalReferTable.phone, pattern),
			ilike(table.externalReferTable.email, pattern)
		);

	let whereExpr = and(
		notDeletedCondition,
		eq(table.externalReferTable.hospitalId, params.hospitalId)
	);
	if (searchCondition) whereExpr = and(whereExpr, searchCondition);

	const [data, countResult] = await Promise.all([
		ensureDb().query.externalReferTable.findMany({
			where: whereExpr,
			with: externalReferWithRelationsWith,
			limit,
			offset
		}),
		ensureDb()
			.select({ count: count() })
			.from(table.externalReferTable)
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

export async function getExternalReferByIdWithRelations(
	event: RequestEvent,
	{ hospitalId, id }: { hospitalId: string; id: number }
) {
	requireUser(event);
	await ensureCanAccessHospital(event, hospitalId);
	return ensureDb().query.externalReferTable.findFirst({
		where: and(
			eq(table.externalReferTable.id, id),
			ne(table.externalReferTable.statusId, StatusEnum.DELETED),
			eq(table.externalReferTable.hospitalId, hospitalId)
		),
		with: externalReferWithRelationsWith
	});
}

export async function createExternalRefer(
	event: RequestEvent,
	payload: ExternalReferSchemaInsert & { hospitalId: string }
): Promise<ExternalReferSchema> {
	requireUser(event);
	await ensureCanAccessHospital(event, payload.hospitalId);
	const [row] = await ensureDb()
		.insert(table.externalReferTable)
		.values(payload)
		.returning();
	if (!row) throw error(500, 'Insert failed');
	return row;
}

export async function updateExternalRefer(
	event: RequestEvent,
	payload: ExternalReferSchemaUpdate & {
		id: number;
		hospitalId: string;
	}
): Promise<ExternalReferSchema> {
	requireUser(event);
	await ensureCanAccessHospital(event, payload.hospitalId);
	const { id, hospitalId, ...rest } = payload;
	const [row] = await ensureDb()
		.update(table.externalReferTable)
		.set(rest)
		.where(
			and(
				eq(table.externalReferTable.id, id),
				eq(table.externalReferTable.hospitalId, hospitalId)
			)
		)
		.returning();
	if (!row) throw error(500, 'Update failed');
	return row;
}

export async function deleteExternalRefer(
	event: RequestEvent,
	{ hospitalId, id }: { hospitalId: string; id: number }
): Promise<void> {
	requireUser(event);
	await ensureCanAccessHospital(event, hospitalId);
	await ensureDb()
		.update(table.externalReferTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(
			and(
				eq(table.externalReferTable.id, id),
				eq(table.externalReferTable.hospitalId, hospitalId)
			)
		);
}

export async function getExternalReferMeta(event: RequestEvent) {
	requireUser(event);
	const db = ensureDb();
	const [countries, titles, states, cities, postalCodes] =
		await Promise.all([
			db.select().from(table.countryTable),
			db.select().from(table.titleTable),
			db.select().from(table.stateTable),
			db.select().from(table.cityTable),
			db.select().from(table.postalCodeTable)
		]);
	return { countries, titles, states, cities, postalCodes };
}
