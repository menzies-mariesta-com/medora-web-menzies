import { error } from '@sveltejs/kit';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import {
	LabAccessionStatusEnum,
	LabSpecimenRejectReasonEnum
} from '$lib/model/enum/diagnostics.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { writeLabAudit } from './lab-audit.server';

const COLLECTION_QUEUE: string[] = [
	LabAccessionStatusEnum.ORDERED,
	LabAccessionStatusEnum.COLLECTION_SCHEDULED
];

const RECEIVE_QUEUE: string[] = [
	LabAccessionStatusEnum.COLLECTED,
	LabAccessionStatusEnum.IN_TRANSIT
];

export async function getAccessionByBarcode(input: {
	hospitalId: string;
	barcode: string;
}) {
	const trimmed = input.barcode.trim();
	const [row] = await ensureDb()
		.select()
		.from(table.labAccessionTable)
		.where(
			and(
				eq(table.labAccessionTable.hospitalId, input.hospitalId),
				eq(table.labAccessionTable.barcodePayload, trimmed)
			)
		)
		.limit(1);
	if (row) return row;
	const [byNo] = await ensureDb()
		.select()
		.from(table.labAccessionTable)
		.where(
			and(
				eq(table.labAccessionTable.hospitalId, input.hospitalId),
				eq(table.labAccessionTable.accessionNo, trimmed)
			)
		)
		.limit(1);
	return byNo ?? null;
}

export async function listAccessionsForWorklist(input: {
	hospitalId: string;
	section?: string;
	statuses: string[];
}) {
	const conditions = [
		eq(table.labAccessionTable.hospitalId, input.hospitalId),
		inArray(table.labAccessionTable.accessionStatus, input.statuses),
		ne(table.labAccessionTable.statusId, StatusEnum.DELETED)
	];
	if (input.section) {
		conditions.push(eq(table.labAccessionTable.section, input.section));
	}

	const rows = await ensureDb()
		.select({
			accession: table.labAccessionTable,
			labOrder: table.labOrderTable,
			patientName: sql<string>`concat(${table.patientTable.firstName}, ' ', coalesce(${table.patientTable.lastName}, ''))`,
			visitNo: table.patientVisitTable.visitNo,
			serviceName: table.serviceItemTable.serviceName,
			specimenId: table.labSpecimenTable.id,
			specimenType: table.labSpecimenTable.specimenType,
			collectedAt: table.labSpecimenTable.collectedAt,
			receivedAt: table.labSpecimenTable.receivedAt
		})
		.from(table.labAccessionTable)
		.innerJoin(
			table.labOrderTable,
			eq(table.labAccessionTable.labOrderId, table.labOrderTable.id)
		)
		.innerJoin(
			table.patientVisitTable,
			eq(table.labOrderTable.visitId, table.patientVisitTable.id)
		)
		.innerJoin(
			table.patientTable,
			eq(table.labOrderTable.patientId, table.patientTable.id)
		)
		.innerJoin(
			table.serviceOrderDetailTable,
			eq(table.labOrderTable.serviceOrderDetailId, table.serviceOrderDetailTable.id)
		)
		.innerJoin(
			table.serviceItemTable,
			eq(table.serviceOrderDetailTable.serviceId, table.serviceItemTable.id)
		)
		.leftJoin(
			table.labSpecimenTable,
			eq(table.labSpecimenTable.accessionId, table.labAccessionTable.id)
		)
		.where(and(...conditions))
		.orderBy(table.labAccessionTable.createdAt);

	return rows.map((r) => ({
		id: r.accession.id,
		accessionNo: r.accession.accessionNo,
		barcodePayload: r.accession.barcodePayload,
		section: r.accession.section,
		accessionStatus: r.accession.accessionStatus,
		patientName: r.patientName,
		visitNo: r.visitNo,
		visitId: r.labOrder.visitId,
		patientId: r.labOrder.patientId,
		serviceName: r.serviceName,
		priority: r.labOrder.priority,
		specimenId: r.specimenId,
		specimenType: r.specimenType,
		collectedAt: r.collectedAt,
		receivedAt: r.receivedAt,
		labOrderId: r.labOrder.id
	}));
}

export async function listCollectionWorklist(hospitalId: string) {
	return listAccessionsForWorklist({
		hospitalId,
		statuses: COLLECTION_QUEUE
	});
}

export async function listReceiveWorklist(hospitalId: string) {
	return listAccessionsForWorklist({
		hospitalId,
		statuses: RECEIVE_QUEUE
	});
}

export async function markCollected(input: {
	hospitalId: string;
	accessionId: number;
	staffId: string;
}) {
	const now = new Date().toISOString();
	const [acc] = await ensureDb()
		.select()
		.from(table.labAccessionTable)
		.where(
			and(
				eq(table.labAccessionTable.id, input.accessionId),
				eq(table.labAccessionTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!acc) throw error(404, 'Accession not found');

	await ensureDb()
		.update(table.labAccessionTable)
		.set({
			accessionStatus: LabAccessionStatusEnum.COLLECTED,
			updatedAt: now
		})
		.where(eq(table.labAccessionTable.id, input.accessionId));

	await ensureDb()
		.update(table.labSpecimenTable)
		.set({
			collectedAt: now,
			collectedBy: input.staffId,
			updatedAt: now
		})
		.where(eq(table.labSpecimenTable.accessionId, input.accessionId));

	await writeLabAudit({
		hospitalId: input.hospitalId,
		entityType: 'lab_accession',
		entityId: input.accessionId,
		action: 'collected',
		staffId: input.staffId
	});
}

export async function markReceived(input: {
	hospitalId: string;
	accessionId: number;
	staffId: string;
}) {
	const now = new Date().toISOString();
	const [acc] = await ensureDb()
		.select()
		.from(table.labAccessionTable)
		.where(
			and(
				eq(table.labAccessionTable.id, input.accessionId),
				eq(table.labAccessionTable.hospitalId, input.hospitalId)
			)
		)
		.limit(1);
	if (!acc) throw error(404, 'Accession not found');

	await ensureDb()
		.update(table.labAccessionTable)
		.set({
			accessionStatus: LabAccessionStatusEnum.RECEIVED,
			updatedAt: now
		})
		.where(eq(table.labAccessionTable.id, input.accessionId));

	await ensureDb()
		.update(table.labSpecimenTable)
		.set({
			receivedAt: now,
			receivedBy: input.staffId,
			updatedAt: now
		})
		.where(eq(table.labSpecimenTable.accessionId, input.accessionId));

	await writeLabAudit({
		hospitalId: input.hospitalId,
		entityType: 'lab_accession',
		entityId: input.accessionId,
		action: 'received',
		staffId: input.staffId
	});
}

export async function rejectSpecimen(input: {
	hospitalId: string;
	accessionId: number;
	staffId: string;
	rejectReason: LabSpecimenRejectReasonEnum | string;
	rejectNote?: string | null;
}) {
	const now = new Date().toISOString();
	await ensureDb()
		.update(table.labAccessionTable)
		.set({
			accessionStatus: LabAccessionStatusEnum.REJECTED,
			updatedAt: now
		})
		.where(
			and(
				eq(table.labAccessionTable.id, input.accessionId),
				eq(table.labAccessionTable.hospitalId, input.hospitalId)
			)
		);

	await ensureDb()
		.update(table.labSpecimenTable)
		.set({
			rejectReason: input.rejectReason,
			rejectNote: input.rejectNote ?? null,
			updatedAt: now
		})
		.where(eq(table.labSpecimenTable.accessionId, input.accessionId));

	await writeLabAudit({
		hospitalId: input.hospitalId,
		entityType: 'lab_accession',
		entityId: input.accessionId,
		action: 'rejected',
		staffId: input.staffId,
		detail: { reason: input.rejectReason }
	});
}

export async function startProcessing(input: {
	hospitalId: string;
	accessionId: number;
	staffId: string;
}) {
	await ensureDb()
		.update(table.labAccessionTable)
		.set({
			accessionStatus: LabAccessionStatusEnum.IN_PROCESS,
			updatedAt: new Date().toISOString()
		})
		.where(
			and(
				eq(table.labAccessionTable.id, input.accessionId),
				eq(table.labAccessionTable.hospitalId, input.hospitalId)
			)
		);
}
