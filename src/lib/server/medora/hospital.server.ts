import { error, type RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, isNotNull, ne } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type {
	HospitalSchema,
	HospitalSchemaInsert,
	HospitalSchemaUpdate
} from '$lib/server/db/schema-type';
import {
	AdminPageKeyEnum,
	RoleEnum,
	StatusEnum,
	type AdminPermissionAction
} from '$lib/model/enum/db-link';
import {
	DiagnosisCodingSystemEnum,
	parseDiagnosisCodingSystem
} from '$lib/model/enum/diagnosis-coding-system.enum';
import type {
	PaginatedResult,
	PaginationParams
} from '$lib/model/type/pagination.type';
import { normalizePagination } from '$lib/model/type/pagination.type';
import {
	loadAdminPagePermissions,
	permissionAllows,
	requireAdminPagePermission
} from '$lib/server/medora/admin/admin-permission.server';

export type HospitalWithOwner = HospitalSchema & {
	owner?: { id: string; name: string | null; email: string } | null;
	/** True when coded diagnoses exist; UI should lock coding_system. */
	codingSystemLocked?: boolean;
	/** Latest WHO import line for the hospital's coding system (admin display). */
	codingReleaseLine?: string | null;
};

function requireUser(event: RequestEvent): {
	userId: string;
	userRoleId: number | null;
} {
	if (!event.locals?.user) throw error(401, 'Unauthorized');
	return {
		userId: event.locals.user.id,
		userRoleId: event.locals.userRoleId ?? null
	};
}

async function assertCanManageHospitals(
	event: RequestEvent,
	action: AdminPermissionAction
): Promise<void> {
	const userRoleId = event.locals.userRoleId ?? null;
	if (userRoleId === RoleEnum.OWNER) return;
	if (userRoleId === RoleEnum.SYSTEM_ADMIN) {
		await requireAdminPagePermission(
			event,
			AdminPageKeyEnum.HOSPITALS,
			action
		);
		return;
	}
	if (userRoleId === RoleEnum.ADMIN_TEAM) {
		await requireAdminPagePermission(
			event,
			AdminPageKeyEnum.HOSPITALS,
			action
		);
		return;
	}
	throw error(403, 'Staff cannot manage hospitals');
}

/** OWNER / SYSTEM_ADMIN, or ADMIN_TEAM with create or edit on Hospitals. */
export async function assertCanUploadHospitalLogo(
	event: RequestEvent
): Promise<void> {
	requireUser(event);
	const userRoleId = event.locals.userRoleId ?? null;
	if (userRoleId === RoleEnum.OWNER) return;
	if (userRoleId === RoleEnum.SYSTEM_ADMIN) return;
	if (userRoleId === RoleEnum.ADMIN_TEAM) {
		let permissions = event.locals.adminPermissions ?? null;
		if (permissions == null) {
			permissions = await loadAdminPagePermissions(
				event.locals.user!.id
			);
			event.locals.adminPermissions = permissions;
		}
		if (
			permissionAllows(
				permissions,
				AdminPageKeyEnum.HOSPITALS,
				'create'
			) ||
			permissionAllows(permissions, AdminPageKeyEnum.HOSPITALS, 'edit')
		) {
			return;
		}
		throw error(403, 'Missing create or edit permission for hospitals');
	}
	throw error(403, 'Staff cannot upload hospital logos');
}

function resolveEffectiveOwnerId(
	event: RequestEvent,
	ownerIdFromClient?: string | null
): string | undefined {
	const userRoleId = event.locals.userRoleId ?? null;
	const userId = event.locals.user?.id ?? null;
	if (userRoleId === RoleEnum.OWNER && userId) return userId;
	return ownerIdFromClient ?? undefined;
}

export async function getHospitalsWithOwnerPaginated(
	event: RequestEvent,
	params?: PaginationParams & { ownerId?: string | null }
): Promise<PaginatedResult<HospitalWithOwner>> {
	requireUser(event);
	await assertCanManageHospitals(event, 'view');

	const effectiveOwnerId = resolveEffectiveOwnerId(
		event,
		params?.ownerId
	);
	const { page, pageSize, limit, offset } =
		normalizePagination(params);

	const hasOwnerFilter =
		effectiveOwnerId != null && effectiveOwnerId !== '';
	let whereExpr = hasOwnerFilter
		? eq(table.hospitalTable.ownerId, effectiveOwnerId!)
		: undefined;

	if (params?.statusId != null) {
		const statusEq = eq(
			table.hospitalTable.statusId,
			params.statusId
		);
		whereExpr =
			whereExpr != null ? and(whereExpr, statusEq) : statusEq;
	}

	const db = ensureDb();
	const baseOpts = {
		limit,
		offset,
		with: {
			owner: { columns: { id: true, name: true, email: true } }
		}
	} as const;

	const [data, countResult] = await Promise.all([
		whereExpr != null
			? (db.query.hospitalTable.findMany({
					...baseOpts,
					where: whereExpr
				}) as Promise<HospitalWithOwner[]>)
			: (db.query.hospitalTable.findMany(baseOpts) as Promise<
					HospitalWithOwner[]
				>),
		whereExpr != null
			? db
					.select({ count: count() })
					.from(table.hospitalTable)
					.where(whereExpr)
			: db.select({ count: count() }).from(table.hospitalTable)
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

async function countCodedDiagnosesForHospital(
	hospitalId: string
): Promise<number> {
	const [row] = await ensureDb()
		.select({ count: count() })
		.from(table.diagnosisTable)
		.innerJoin(
			table.patientVisitTable,
			eq(table.diagnosisTable.visitId, table.patientVisitTable.id)
		)
		.where(
			and(
				eq(table.patientVisitTable.hospitalId, hospitalId),
				ne(table.diagnosisTable.statusId, StatusEnum.DELETED),
				isNotNull(table.diagnosisTable.diagnosisCodeId)
			)
		);
	return Number(row?.count ?? 0);
}

export async function createHospital(
	event: RequestEvent,
	input: HospitalSchemaInsert
): Promise<HospitalSchema> {
	const { userRoleId } = requireUser(event);
	if (userRoleId === RoleEnum.OWNER) {
		throw error(
			403,
			'Owners cannot create hospitals. Contact your administrator.'
		);
	}
	await assertCanManageHospitals(event, 'create');

	const codingSystem = parseDiagnosisCodingSystem(
		input.codingSystem,
		DiagnosisCodingSystemEnum.ICD10
	);
	const values = { ...input, codingSystem };

	const [inserted] = await ensureDb()
		.insert(table.hospitalTable)
		.values(values)
		.returning();
	if (!inserted) throw error(500, 'Failed to create hospital');
	return inserted;
}

export async function updateHospital(
	event: RequestEvent,
	payload: HospitalSchemaUpdate & { id: string }
): Promise<HospitalSchema> {
	const { userId, userRoleId } = requireUser(event);
	await assertCanManageHospitals(event, 'edit');

	const { id, ...data } = payload;
	if (!id) throw error(400, 'Hospital id is required');

	if (userRoleId === RoleEnum.OWNER) {
		const [hospital] = await ensureDb()
			.select({ ownerId: table.hospitalTable.ownerId })
			.from(table.hospitalTable)
			.where(eq(table.hospitalTable.id, id))
			.limit(1);
		if (!hospital || hospital.ownerId !== userId)
			throw error(403, 'You can only update your own hospitals');
		data.ownerId = userId;
	}

	if (data.codingSystem !== undefined) {
		const nextSystem = parseDiagnosisCodingSystem(data.codingSystem);
		data.codingSystem = nextSystem;
		const [current] = await ensureDb()
			.select({ codingSystem: table.hospitalTable.codingSystem })
			.from(table.hospitalTable)
			.where(eq(table.hospitalTable.id, id))
			.limit(1);
		if (!current) throw error(404, 'Hospital not found');
		if (current.codingSystem !== nextSystem) {
			const codedCount = await countCodedDiagnosesForHospital(id);
			if (codedCount > 0) {
				throw error(
					409,
					'Cannot change coding system after coded diagnoses exist for this hospital.'
				);
			}
		}
	}

	const [updated] = await ensureDb()
		.update(table.hospitalTable)
		.set(data)
		.where(eq(table.hospitalTable.id, id))
		.returning();
	if (!updated) throw error(404, 'Hospital not found');
	return updated;
}

export async function getHospitalById(
	event: RequestEvent,
	id: string
): Promise<HospitalWithOwner | null> {
	const { userId, userRoleId } = requireUser(event);
	await assertCanManageHospitals(event, 'view');
	if (!id) throw error(400, 'Hospital id is required');

	const row = await ensureDb().query.hospitalTable.findFirst({
		where: eq(table.hospitalTable.id, id),
		with: {
			owner: { columns: { id: true, name: true, email: true } }
		}
	});
	if (!row) return null;
	if (userRoleId === RoleEnum.OWNER && row.ownerId !== userId) {
		throw error(403, 'You can only view your own hospitals');
	}
	const codedCount = await countCodedDiagnosesForHospital(id);
	const [release] = await ensureDb()
		.select({
			system: table.diagnosisCodeReleaseTable.system,
			releaseId: table.diagnosisCodeReleaseTable.releaseId,
			titleCount: table.diagnosisCodeReleaseTable.titleCount,
			importedAt: table.diagnosisCodeReleaseTable.importedAt
		})
		.from(table.diagnosisCodeReleaseTable)
		.where(eq(table.diagnosisCodeReleaseTable.system, row.codingSystem))
		.orderBy(desc(table.diagnosisCodeReleaseTable.importedAt))
		.limit(1);
	const codingReleaseLine = release
		? `${release.system} release ${release.releaseId} (${release.titleCount} codes, imported ${String(release.importedAt)})`
		: null;
	return {
		...(row as HospitalWithOwner),
		codingSystemLocked: codedCount > 0,
		codingReleaseLine
	};
}

export async function deleteHospital(
	event: RequestEvent,
	{ id }: { id: string }
): Promise<void> {
	const { userRoleId } = requireUser(event);
	if (userRoleId === RoleEnum.OWNER) {
		throw error(
			403,
			'Owners cannot delete hospitals. Contact your administrator.'
		);
	}
	await assertCanManageHospitals(event, 'delete');
	if (!id) throw error(400, 'Hospital id is required');

	// Soft delete: keep the row, mark Inactive (status filter can list it again).
	await ensureDb()
		.update(table.hospitalTable)
		.set({ statusId: StatusEnum.INACTIVE })
		.where(eq(table.hospitalTable.id, id));
}
