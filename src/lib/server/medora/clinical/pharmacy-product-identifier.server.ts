import { and, eq } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { ensureDb } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

export async function listPharmacyProductIdentifiers(hospitalId: string) {
	return ensureDb()
		.select({
			id: table.pharmacyProductIdentifierTable.id,
			itemMasterId: table.pharmacyProductIdentifierTable.itemMasterId,
			barcodeValue: table.pharmacyProductIdentifierTable.barcodeValue,
			identifierType: table.pharmacyProductIdentifierTable.identifierType,
			isPrimary: table.pharmacyProductIdentifierTable.isPrimary,
			itemName: table.itemMasterTable.itemName
		})
		.from(table.pharmacyProductIdentifierTable)
		.innerJoin(
			table.itemMasterTable,
			eq(
				table.pharmacyProductIdentifierTable.itemMasterId,
				table.itemMasterTable.id
			)
		)
		.where(
			and(
				eq(
					table.pharmacyProductIdentifierTable.hospitalId,
					hospitalId
				),
				eq(
					table.pharmacyProductIdentifierTable.statusId,
					StatusEnum.ACTIVE
				)
			)
		);
}

export async function savePharmacyProductIdentifier(input: {
	hospitalId: string;
	itemMasterId: number;
	barcodeValue: string;
	identifierType: string;
	isPrimary?: boolean;
}) {
	const [row] = await ensureDb()
		.insert(table.pharmacyProductIdentifierTable)
		.values({
			hospitalId: input.hospitalId,
			itemMasterId: input.itemMasterId,
			barcodeValue: input.barcodeValue.trim(),
			identifierType: input.identifierType,
			isPrimary: input.isPrimary ?? false
		})
		.returning();
	return row;
}

export async function deletePharmacyProductIdentifier(input: {
	hospitalId: string;
	id: number;
}) {
	await ensureDb()
		.update(table.pharmacyProductIdentifierTable)
		.set({ statusId: StatusEnum.DELETED })
		.where(
			and(
				eq(table.pharmacyProductIdentifierTable.id, input.id),
				eq(
					table.pharmacyProductIdentifierTable.hospitalId,
					input.hospitalId
				)
			)
		);
}
