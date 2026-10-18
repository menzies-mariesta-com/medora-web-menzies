import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { VisitTypeEnum } from '$lib/model/enum/db-link';

export async function assertEdVisitForHospital(input: {
	hospitalId: string;
	visitId: string;
}): Promise<{ branchId: string | null; visitTypeId: number | null }> {
	const [visit] = await ensureDb()
		.select({
			branchId: table.patientVisitTable.branchId,
			visitTypeId: table.patientVisitTable.visitTypeId,
			hospitalId: table.patientVisitTable.hospitalId
		})
		.from(table.patientVisitTable)
		.where(
			and(
				eq(table.patientVisitTable.id, input.visitId),
				eq(table.patientVisitTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!visit) throw error(404, 'Visit not found');
	if (visit.visitTypeId !== VisitTypeEnum.ED) {
		throw error(400, 'Visit is not an emergency (ED) visit');
	}
	return {
		branchId: visit.branchId,
		visitTypeId: visit.visitTypeId
	};
}
