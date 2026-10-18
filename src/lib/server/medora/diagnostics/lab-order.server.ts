import { error } from '@sveltejs/kit';
import { and, eq, inArray, ne } from 'drizzle-orm';
import {
	LabAccessionStatusEnum,
	LabOrderStatusEnum,
	LabSpecimenTypeEnum
} from '$lib/model/enum/diagnostics.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import {
	isLaboratoryServiceItem,
	resolveTestsForServiceItem
} from './lab-catalog.server';
import { getOrCreateHospitalLabSetting } from './hospital-lab-setting.server';
import { writeLabAudit } from './lab-audit.server';

async function orderContextFromDetail(serviceOrderDetailId: number) {
	const [row] = await ensureDb()
		.select({
			detail: table.serviceOrderDetailTable,
			order: table.serviceOrderTable,
			visit: table.patientVisitTable,
			serviceId: table.serviceOrderDetailTable.serviceId,
			isUrgent: table.serviceOrderDetailTable.isUrgent
		})
		.from(table.serviceOrderDetailTable)
		.innerJoin(
			table.serviceOrderTable,
			eq(table.serviceOrderDetailTable.serviceOrderId, table.serviceOrderTable.id)
		)
		.innerJoin(
			table.patientVisitTable,
			eq(table.serviceOrderTable.visitId, table.patientVisitTable.id)
		)
		.where(eq(table.serviceOrderDetailTable.id, serviceOrderDetailId))
		.limit(1);
	if (!row) return null;
	return row;
}

function defaultSpecimenForSection(section: string): string {
	if (section === 'hematology') return LabSpecimenTypeEnum.EDTA;
	if (section === 'microbiology') return LabSpecimenTypeEnum.SWAB;
	return LabSpecimenTypeEnum.SERUM;
}

export async function ensureLabOrderForDetail(
	serviceOrderDetailId: number,
	staffId?: string | null
) {
	const ctx = await orderContextFromDetail(serviceOrderDetailId);
	if (!ctx) return null;
	if (ctx.detail.statusId === StatusEnum.INACTIVE) return null;

	const isLab = await isLaboratoryServiceItem(ctx.serviceId);
	if (!isLab) return null;

	const hospitalId = ctx.visit.hospitalId;
	const existing = await ensureDb()
		.select()
		.from(table.labOrderTable)
		.where(eq(table.labOrderTable.serviceOrderDetailId, serviceOrderDetailId))
		.limit(1);
	if (existing[0]) return existing[0];

	const resolved = await resolveTestsForServiceItem({
		hospitalId,
		serviceItemId: ctx.serviceId
	});
	const section = resolved?.section ?? 'chemistry';
	const testIds = resolved?.testIds ?? [];
	const tests =
		testIds.length > 0
			? await ensureDb()
					.select({
						id: table.labTestTable.id,
						code: table.labTestTable.code,
						name: table.labTestTable.name
					})
					.from(table.labTestTable)
					.where(inArray(table.labTestTable.id, testIds))
			: [];

	const [labOrder] = await ensureDb()
		.insert(table.labOrderTable)
		.values({
			hospitalId,
			branchId: ctx.order.branchId,
			visitId: ctx.visit.id,
			patientId: ctx.visit.patientId,
			serviceOrderDetailId,
			priority: ctx.isUrgent ? 'urgent' : 'routine',
			orderStatus: LabOrderStatusEnum.ORDERED
		})
		.returning();
	if (!labOrder) throw error(500, 'Unable to create lab order');

	const setting = await getOrCreateHospitalLabSetting(hospitalId);
	const accessionNo = `${setting.accessionPrefix}-${labOrder.id}`;
	const barcodePayload = `LAB|${hospitalId}|${accessionNo}|${labOrder.id}`;

	const [accession] = await ensureDb()
		.insert(table.labAccessionTable)
		.values({
			hospitalId,
			labOrderId: labOrder.id,
			accessionNo,
			barcodePayload,
			section,
			accessionStatus: LabAccessionStatusEnum.ORDERED,
			requestedTestsJson: tests
		})
		.returning();

	if (accession) {
		await ensureDb().insert(table.labSpecimenTable).values({
			accessionId: accession.id,
			specimenType: defaultSpecimenForSection(section)
		});
		await ensureDb().insert(table.labResultReportTable).values({
			accessionId: accession.id
		});
	}

	await writeLabAudit({
		hospitalId,
		entityType: 'lab_order',
		entityId: labOrder.id,
		action: 'create_from_service_order',
		staffId,
		detail: { serviceOrderDetailId }
	});

	return labOrder;
}

export async function cancelLabOrderForDetail(serviceOrderDetailId: number) {
	const [labOrder] = await ensureDb()
		.select()
		.from(table.labOrderTable)
		.where(eq(table.labOrderTable.serviceOrderDetailId, serviceOrderDetailId))
		.limit(1);
	if (!labOrder) return;

	const accessions = await ensureDb()
		.select()
		.from(table.labAccessionTable)
		.where(eq(table.labAccessionTable.labOrderId, labOrder.id));

	for (const acc of accessions) {
		if (
			acc.accessionStatus === LabAccessionStatusEnum.COLLECTED ||
			acc.accessionStatus === LabAccessionStatusEnum.RECEIVED ||
			acc.accessionStatus === LabAccessionStatusEnum.IN_PROCESS ||
			acc.accessionStatus === LabAccessionStatusEnum.RESULTED ||
			acc.accessionStatus === LabAccessionStatusEnum.VERIFIED ||
			acc.accessionStatus === LabAccessionStatusEnum.RELEASED
		) {
			continue;
		}
		await ensureDb()
			.update(table.labAccessionTable)
			.set({
				accessionStatus: LabAccessionStatusEnum.CANCELLED,
				updatedAt: new Date().toISOString()
			})
			.where(eq(table.labAccessionTable.id, acc.id));
	}

	await ensureDb()
		.update(table.labOrderTable)
		.set({
			orderStatus: LabOrderStatusEnum.CANCELLED,
			updatedAt: new Date().toISOString()
		})
		.where(eq(table.labOrderTable.id, labOrder.id));
}

export async function listLabOrdersForVisit(input: {
	hospitalId: string;
	visitId: string;
}) {
	return ensureDb()
		.select({
			order: table.labOrderTable,
			serviceName: table.serviceItemTable.serviceName,
			isUrgent: table.serviceOrderDetailTable.isUrgent
		})
		.from(table.labOrderTable)
		.innerJoin(
			table.serviceOrderDetailTable,
			eq(table.labOrderTable.serviceOrderDetailId, table.serviceOrderDetailTable.id)
		)
		.innerJoin(
			table.serviceItemTable,
			eq(table.serviceOrderDetailTable.serviceId, table.serviceItemTable.id)
		)
		.where(
			and(
				eq(table.labOrderTable.hospitalId, input.hospitalId),
				eq(table.labOrderTable.visitId, input.visitId),
				ne(table.labOrderTable.statusId, StatusEnum.DELETED)
			)
		);
}

export async function getLabStatusForServiceOrderDetail(
	serviceOrderDetailId: number
): Promise<string | null> {
	const [acc] = await ensureDb()
		.select({ accessionStatus: table.labAccessionTable.accessionStatus })
		.from(table.labOrderTable)
		.innerJoin(
			table.labAccessionTable,
			eq(table.labAccessionTable.labOrderId, table.labOrderTable.id)
		)
		.where(eq(table.labOrderTable.serviceOrderDetailId, serviceOrderDetailId))
		.limit(1);
	return acc?.accessionStatus ?? null;
}
