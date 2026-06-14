import { error, type RequestEvent } from '@sveltejs/kit';
import { and, eq, isNull, ne, or } from 'drizzle-orm';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureCanAccessHospital } from '$lib/server/heka/ensure-can-access-hospital.server';
import {
	getDocumentByCode,
	type DocumentWithRelations
} from '$lib/server/heka/document-master/document.server';
import type { DocumentSettingWithRelations } from '$lib/model/type/document-setting.type';

export async function getDocumentSettingsForPrint(
	event: RequestEvent,
	hospitalId: string
): Promise<DocumentSettingWithRelations[]> {
	await ensureCanAccessHospital(event, hospitalId);

	const notDeleted = ne(
		table.documentSettingTable.statusId,
		StatusEnum.DELETED
	);
	const scopeFilter = or(
		eq(table.documentSettingTable.hospitalId, hospitalId),
		isNull(table.documentSettingTable.hospitalId)
	);

	return ensureDb().query.documentSettingTable.findMany({
		where: and(notDeleted, scopeFilter),
		with: { documentType: true, hospital: true, status: true },
		orderBy: (t, { desc }) => desc(t.createdAt)
	}) as Promise<DocumentSettingWithRelations[]>;
}

export type DocumentPrintBootstrap = {
	document: DocumentWithRelations | null;
	documentSettings: DocumentSettingWithRelations[];
};

export async function getDocumentPrintBootstrap(
	event: RequestEvent,
	hospitalId: string,
	code: string
): Promise<DocumentPrintBootstrap> {
	const trimmed = code.trim();
	if (!trimmed) throw error(400, 'code is required');

	const [document, documentSettings] = await Promise.all([
		getDocumentByCode(event, trimmed),
		getDocumentSettingsForPrint(event, hospitalId)
	]);

	return { document, documentSettings };
}
