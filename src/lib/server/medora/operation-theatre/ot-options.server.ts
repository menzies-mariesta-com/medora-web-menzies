import { and, asc, eq, ne } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import type { OtOptions } from '$lib/model/type/medora/operation-theatre.type';
import { OT_STATUS_VIEWS } from '$lib/tool/operation-theatre/ot-status.util';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { listOtMasters } from './ot-master.server';

export async function getOtOptions(input: {
	hospitalId: string;
	branchId?: string | null;
	currentStaffId?: string | null;
}): Promise<OtOptions> {
	const db = ensureDb();
	const [branches, rooms, surgeons, services, genders] =
		await Promise.all([
			db
				.select({
					id: table.hospitalBranchTable.id,
					name: table.hospitalBranchTable.name
				})
				.from(table.hospitalBranchTable)
				.where(
					and(
						eq(
							table.hospitalBranchTable.hospitalId,
							input.hospitalId
						),
						ne(table.hospitalBranchTable.statusId, StatusEnum.DELETED)
					)
				)
				.orderBy(asc(table.hospitalBranchTable.name)),
			listOtMasters({
				hospitalId: input.hospitalId,
				branchId: input.branchId,
				includeInactive: false
			}),
			db
				.select({
					id: table.staffTable.id,
					firstName: table.staffTable.firstName,
					lastName: table.staffTable.lastName,
					specialization: table.specializationTable.name
				})
				.from(table.staffTable)
				.leftJoin(
					table.specializationTable,
					eq(
						table.staffTable.specializationId,
						table.specializationTable.id
					)
				)
				.where(
					and(
						ne(table.staffTable.statusId, StatusEnum.DELETED),
						ne(table.staffTable.statusId, StatusEnum.INACTIVE)
					)
				)
				.orderBy(
					asc(table.staffTable.firstName),
					asc(table.staffTable.lastName)
				),
			db
				.select({
					id: table.serviceItemTable.id,
					name: table.serviceItemTable.serviceName
				})
				.from(table.serviceItemTable)
				.where(
					and(
						eq(table.serviceItemTable.hospitalId, input.hospitalId),
						ne(table.serviceItemTable.statusId, StatusEnum.DELETED)
					)
				)
				.orderBy(asc(table.serviceItemTable.serviceName)),
			db
				.select({
					id: table.genderTable.id,
					name: table.genderTable.name
				})
				.from(table.genderTable)
				.where(ne(table.genderTable.statusId, StatusEnum.DELETED))
				.orderBy(asc(table.genderTable.name))
		]);

	return {
		branches: branches.map((b) => ({
			id: b.id,
			name: b.name ?? 'Facility'
		})),
		rooms,
		surgeons: surgeons.map((s) => ({
			id: s.id,
			name:
				[s.firstName, s.lastName].filter(Boolean).join(' ').trim() ||
				'Staff',
			specialty: s.specialization
		})) as OtOptions['surgeons'],
		services: services.map((s) => ({
			id: s.id,
			name: s.name ?? `Service #${s.id}`
		})),
		genders: genders.map((g) => ({
			id: g.id,
			name: g.name ?? `Gender #${g.id}`
		})),
		statuses: OT_STATUS_VIEWS.map((s) => ({
			id: s.id,
			name: s.label,
			code: s.code
		})),
		currentStaffId: input.currentStaffId ?? null
	};
}
