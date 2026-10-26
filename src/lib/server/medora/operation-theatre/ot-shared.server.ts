import { and, eq, ne, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export const otSurgeon = alias(table.staffTable, 'ot_surgeon');
export const otPaediatrician = alias(
	table.staffTable,
	'ot_paediatrician'
);
export const otProvider = alias(table.staffTable, 'ot_provider');
export const otRequestedBy = alias(
	table.staffTable,
	'ot_requested_by_staff'
);
export const otWardToBy = alias(
	table.staffTable,
	'ot_ward_to_by_staff'
);
export const otAdmittingDoctor = alias(
	table.staffTable,
	'ot_admitting_doctor_staff'
);

export function staffDisplayNameSql(staff: typeof otSurgeon) {
	return sql<string>`nullif(trim(concat(coalesce(${staff.firstName}, ''), ' ', coalesce(${staff.lastName}, ''))), '')`;
}

export function patientDisplayNameSql() {
	return sql<string>`nullif(trim(concat(coalesce(${table.patientTable.firstName}, ''), ' ', coalesce(${table.patientTable.middleName}, ''), ' ', coalesce(${table.patientTable.lastName}, ''))), '')`;
}

export function ageFromDob(
	dob: string | null | undefined
): number | null {
	if (!dob) return null;
	const birth = new Date(`${dob}T12:00:00`);
	if (Number.isNaN(birth.getTime())) return null;
	const now = new Date();
	let age = now.getFullYear() - birth.getFullYear();
	const month = now.getMonth() - birth.getMonth();
	if (month < 0 || (month === 0 && now.getDate() < birth.getDate()))
		age -= 1;
	return age >= 0 && age < 150 ? age : null;
}

export function ageGenderLabel(input: {
	dateOfBirth: string | null;
	genderName: string | null;
}): string {
	const age = ageFromDob(input.dateOfBirth);
	const gender = input.genderName?.trim() ?? '';
	if (age == null && !gender) return '—';
	if (age == null) return gender;
	return gender ? `${age} / ${gender}` : `${age}`;
}

export function activeOtRoomConditions(
	hospitalId: string,
	branchId?: string | null
): SQL[] {
	const conditions: SQL[] = [
		eq(table.otRoomTable.hospitalId, hospitalId),
		ne(table.otRoomTable.statusId, StatusEnum.DELETED)
	];
	if (branchId) {
		conditions.push(eq(table.otRoomTable.branchId, branchId));
	}
	return conditions;
}

export async function resolveStaffId(
	staffId: string | null | undefined
) {
	return staffId?.trim() ? staffId.trim() : null;
}

export function localDateBounds(date: string): {
	start: string;
	end: string;
} {
	return {
		start: `${date}T00:00:00.000Z`,
		end: `${date}T23:59:59.999Z`
	};
}

export function dateOnly(
	value: string | null | undefined
): string | null {
	if (!value) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function visitAdmissionExists(
	hospitalId: string,
	visitId: string
): Promise<boolean> {
	return ensureDb()
		.select({ id: table.patientVisitTable.id })
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, visitId),
				eq(table.patientVisitTable.hospitalId, hospitalId),
				ne(table.patientVisitTable.statusId, StatusEnum.DELETED)
			)
		)
		.limit(1)
		.then((rows) => rows.length > 0);
}
