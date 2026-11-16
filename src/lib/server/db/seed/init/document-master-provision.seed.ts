/**
 * Document provision — global catalog `document` rows, then per-hospital `hospital_document` links.
 */
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { StatusEnum } from '$lib/model/enum/db-link';
import { seedLogger } from '$lib/logger';
import * as table from '$lib/server/db/schema';
import { ESSENTIAL_HOSPITAL_PROVISION_TEMPLATES } from '$lib/server/medora/document-master/document-essential-provision.constant';
import {
	provisionTemplateForHospital,
	seedGlobalDocumentsFromCatalog
} from '$lib/server/medora/document-master/provision-templates.server';

export async function provisionDocumentMasterForSeed(
	db: NeonHttpDatabase
): Promise<void> {
	await seedGlobalDocumentsFromCatalog(db, 'en');

	const templates = ESSENTIAL_HOSPITAL_PROVISION_TEMPLATES;
	seedLogger.info(
		`Link essential catalog templates to hospitals (${templates.length})`
	);

	const hospitals = await db
		.select({ id: table.hospitalTable.id })
		.from(table.hospitalTable)
		.where(eq(table.hospitalTable.statusId, StatusEnum.ACTIVE));

	if (hospitals.length === 0) {
		seedLogger.info(
			'Skipped: hospital document links (no active hospitals)'
		);
		return;
	}

	for (const { id: hospitalId } of hospitals) {
		let done = 0;
		for (const tpl of templates) {
			try {
				await provisionTemplateForHospital(db, hospitalId, tpl, 'en');
			} catch (e) {
				seedLogger.warn(
					`Provision skip ${tpl.title} @ ${hospitalId}: ${e instanceof Error ? e.message : String(e)}`
				);
			}
			done += 1;
			if (done % 50 === 0 || done === templates.length) {
				seedLogger.info(
					`Provisioning hospital ${hospitalId}: ${done}/${templates.length} templates`
				);
			}
		}
	}
	seedLogger.info(
		`Provisioned: hospital_document links for ${hospitals.length} hospital(s)`
	);
}
