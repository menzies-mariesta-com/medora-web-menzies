import { eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { StatusEnum } from '$lib/model/enum/db-link';
import { seedLogger } from '$lib/logger';
import * as table from '$lib/server/db/schema';
import { provisionTemplatesForHospital } from './provision-templates.server';

export async function provisionHospitalDocumentsForAllHospitals(
	db: NeonHttpDatabase
): Promise<void> {
	const hospitals = await db
		.select({ id: table.hospitalTable.id })
		.from(table.hospitalTable)
		.where(eq(table.hospitalTable.statusId, StatusEnum.ACTIVE));
	const ids = hospitals.map((r) => r.id);
	if (ids.length === 0) {
		seedLogger.info(
			'Skipped: hospital document provision (no active hospitals)'
		);
		return;
	}
	for (const hospitalId of ids) {
		await provisionDefaultHospitalDocuments(hospitalId);
	}
	seedLogger.info(
		`Provisioned: document templates for ${ids.length} hospital(s)`
	);
}

export async function provisionDefaultHospitalDocuments(
	hospitalId: string
): Promise<void> {
	await provisionTemplatesForHospital(hospitalId);
}
