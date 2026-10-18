import { and, eq } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listImmunizationMasters() {
	return ensureDb()
		.select()
		.from(table.immunizationMasterTable)
		.where(eq(table.immunizationMasterTable.statusId, StatusEnum.ACTIVE));
}

export async function listPatientImmunizations(input: {
	hospitalId: string;
	patientId: string;
}) {
	return ensureDb()
		.select({
			id: table.patientImmunizationTable.id,
			immunizationMasterId:
				table.patientImmunizationTable.immunizationMasterId,
			administeredOn: table.patientImmunizationTable.administeredOn,
			doseSequence: table.patientImmunizationTable.doseSequence,
			vaccineName: table.immunizationMasterTable.name
		})
		.from(table.patientImmunizationTable)
		.innerJoin(
			table.immunizationMasterTable,
			eq(
				table.patientImmunizationTable.immunizationMasterId,
				table.immunizationMasterTable.id
			)
		)
		.where(
			and(
				eq(table.patientImmunizationTable.hospitalId, input.hospitalId),
				eq(table.patientImmunizationTable.patientId, input.patientId)
			)
		);
}

export async function recordPatientImmunization(input: {
	hospitalId: string;
	patientId: string;
	visitId?: string | null;
	immunizationMasterId: number;
	administeredOn: string;
	doseSequence: number;
	lotNumber?: string | null;
	site?: string | null;
	administratorStaffId?: string | null;
	visGiven?: boolean;
	remark?: string | null;
}) {
	const [row] = await ensureDb()
		.insert(table.patientImmunizationTable)
		.values({
			hospitalId: input.hospitalId,
			patientId: input.patientId,
			visitId: input.visitId ?? null,
			immunizationMasterId: input.immunizationMasterId,
			administeredOn: input.administeredOn,
			doseSequence: input.doseSequence,
			lotNumber: input.lotNumber ?? null,
			site: input.site ?? null,
			administratorStaffId: input.administratorStaffId ?? null,
			visGiven: input.visGiven ?? false,
			remark: input.remark ?? null
		})
		.returning();
	return row;
}

/** Due vaccines from schedule rules vs recorded doses (simplified). */
export async function computeImmunizationDueList(input: {
	patientId: string;
	dateOfBirth: string | null;
}) {
	if (!input.dateOfBirth) return [];
	const masters = await listImmunizationMasters();
	const recorded = await ensureDb()
		.select({
			immunizationMasterId:
				table.patientImmunizationTable.immunizationMasterId,
			doseSequence: table.patientImmunizationTable.doseSequence
		})
		.from(table.patientImmunizationTable)
		.where(eq(table.patientImmunizationTable.patientId, input.patientId));
	const due: { masterId: number; name: string; nextDose: number }[] = [];
	for (const m of masters) {
		const doses = recorded.filter((r) => r.immunizationMasterId === m.id);
		const maxDose = doses.reduce(
			(acc, d) => Math.max(acc, d.doseSequence),
			0
		);
		const rules = (m.scheduleRulesJson as { doses?: number }) ?? {};
		const total = rules.doses ?? 1;
		if (maxDose < total) {
			due.push({
				masterId: m.id,
				name: m.name,
				nextDose: maxDose + 1
			});
		}
	}
	return due;
}
