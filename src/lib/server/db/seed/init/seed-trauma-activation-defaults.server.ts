import { sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { StatusEnum } from '$lib/model/enum/db-link';
import { seedLogger } from '$lib/logger';

const DEFAULT_LEVELS: {
	code: string;
	name: string;
	description: string;
	color: string;
	sortOrder: number;
}[] = [
	{
		code: 'I',
		name: 'Level I — Full team',
		description: 'Immediate life-threatening injury',
		color: 'error',
		sortOrder: 1
	},
	{
		code: 'II',
		name: 'Level II — Selective team',
		description: 'Potentially life-threatening',
		color: 'warning',
		sortOrder: 2
	},
	{
		code: 'III',
		name: 'Level III — Limited response',
		description: 'Stable trauma evaluation',
		color: 'info',
		sortOrder: 3
	}
];

const DEFAULT_MILESTONES: { code: string; label: string; sortOrder: number }[] =
	[
		{ code: 'team_arrived', label: 'Trauma team arrived', sortOrder: 1 },
		{ code: 'primary_survey', label: 'Primary survey complete', sortOrder: 2 },
		{ code: 'imaging', label: 'Priority imaging', sortOrder: 3 }
	];

const DEFAULT_TEAM_ROLES: { code: string; label: string; sortOrder: number }[] =
	[
		{ code: 'trauma_lead', label: 'Trauma team lead', sortOrder: 1 },
		{ code: 'anesthesia', label: 'Anesthesia', sortOrder: 2 },
		{ code: 'nursing', label: 'Trauma nurse', sortOrder: 3 }
	];

/** Idempotent trauma masters per active hospital. */
export async function seedTraumaActivationDefaultsForHospitals(
	db: NeonHttpDatabase
): Promise<void> {
	try {
		for (const def of DEFAULT_LEVELS) {
			await db.execute(sql`
				INSERT INTO hospital_trauma_activation_level (hospital_id, code, name, description, color, sort_order, status_id)
				SELECT h.id, ${def.code}, ${def.name}, ${def.description}, ${def.color}, ${def.sortOrder}, ${StatusEnum.ACTIVE}
				FROM hospital h
				WHERE h.status_id = ${StatusEnum.ACTIVE}
				ON CONFLICT (hospital_id, code) DO UPDATE SET
					name = EXCLUDED.name,
					description = EXCLUDED.description,
					color = EXCLUDED.color,
					sort_order = EXCLUDED.sort_order,
					status_id = EXCLUDED.status_id,
					updated_at = now()
			`);
		}
		for (const def of DEFAULT_MILESTONES) {
			await db.execute(sql`
				INSERT INTO hospital_trauma_milestone_template (hospital_id, code, label, sort_order, status_id)
				SELECT h.id, ${def.code}, ${def.label}, ${def.sortOrder}, ${StatusEnum.ACTIVE}
				FROM hospital h
				WHERE h.status_id = ${StatusEnum.ACTIVE}
				ON CONFLICT (hospital_id, code) DO UPDATE SET
					label = EXCLUDED.label,
					sort_order = EXCLUDED.sort_order,
					status_id = EXCLUDED.status_id,
					updated_at = now()
			`);
		}
		for (const def of DEFAULT_TEAM_ROLES) {
			await db.execute(sql`
				INSERT INTO hospital_trauma_team_role (hospital_id, code, label, sort_order, status_id)
				SELECT h.id, ${def.code}, ${def.label}, ${def.sortOrder}, ${StatusEnum.ACTIVE}
				FROM hospital h
				WHERE h.status_id = ${StatusEnum.ACTIVE}
				ON CONFLICT (hospital_id, code) DO UPDATE SET
					label = EXCLUDED.label,
					sort_order = EXCLUDED.sort_order,
					status_id = EXCLUDED.status_id,
					updated_at = now()
			`);
		}
		seedLogger.info('Seeded: trauma activation defaults per hospital');
	} catch (e) {
		seedLogger.warn(
			`Skipped: trauma activation seed (${e instanceof Error ? e.message : String(e)})`
		);
	}
}