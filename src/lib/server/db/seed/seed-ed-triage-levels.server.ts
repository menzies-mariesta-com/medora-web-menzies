import { sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { StatusEnum } from '$lib/model/enum/db-link';
import { seedLogger } from '$lib/logger';

const DEFAULT_LEVELS: { level: number; name: string; color: string }[] =
	[
		{ level: 1, name: 'Level 1 - Immediate', color: 'error' },
		{ level: 2, name: 'Level 2 - Emergency', color: 'warning' },
		{ level: 3, name: 'Level 3 - Urgent', color: 'info' },
		{ level: 4, name: 'Level 4 - Less urgent', color: 'success' },
		{ level: 5, name: 'Level 5 - Non-urgent', color: 'neutral' }
	];

/** Idempotent ED triage levels 1-5 for every active hospital. */
export async function seedEdTriageLevelsForHospitals(
	db: NeonHttpDatabase
): Promise<void> {
	try {
		for (const def of DEFAULT_LEVELS) {
			await db.execute(sql`
				INSERT INTO ed_triage_level (hospital_id, level, name, color, status_id)
				SELECT h.id, ${def.level}, ${def.name}, ${def.color}, ${StatusEnum.ACTIVE}
				FROM hospital h
				WHERE h.status_id = ${StatusEnum.ACTIVE}
				ON CONFLICT (hospital_id, level) DO UPDATE SET
					name = EXCLUDED.name,
					color = EXCLUDED.color,
					status_id = EXCLUDED.status_id,
					updated_at = now()
			`);
		}
		seedLogger.info('Seeded: ed_triage_level (1-5 per hospital)');
	} catch (e) {
		seedLogger.warn(
			`Skipped: ed_triage_level seed (${e instanceof Error ? e.message : String(e)})`
		);
	}
}
