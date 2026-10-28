import { sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { StatusEnum, IpdBedStatusEnum } from '$lib/model/enum/db-link';
import { seedLogger } from '$lib/logger';

type HospitalRow = { id: string; branch_id: string | null };

function rowsOf<T>(result: unknown): T[] {
	if (Array.isArray(result)) return result as T[];
	const r = result as { rows?: T[] };
	return Array.isArray(r?.rows) ? r.rows : [];
}

/** Idempotent demo ER ward/room/beds in unified master tables (is_er = true). */
export async function seedDemoErMasterForHospitals(
	db: NeonHttpDatabase
): Promise<void> {
	const hospitals = rowsOf<HospitalRow>(
		await db.execute(sql`
			SELECT h.id::text AS id, b.id::text AS branch_id
			FROM hospital h
			LEFT JOIN hospital_branch b ON b.hospital_id = h.id AND b.status_id = ${StatusEnum.ACTIVE}
			WHERE h.status_id = ${StatusEnum.ACTIVE}
			ORDER BY h.created_at
			LIMIT 5
		`)
	);
	if (hospitals.length === 0) {
		seedLogger.info('Skipped: demo ER master (no hospital)');
		return;
	}

	for (const h of hospitals) {
		const hospitalId = h.id;
		const branchId = h.branch_id;
		if (!branchId) continue;

		const existing = rowsOf<{ id: number }>(
			await db.execute(sql`
				SELECT id FROM ward
				WHERE hospital_id = ${hospitalId}::uuid
					AND is_er = true
					AND code = 'ER-DEMO'
				LIMIT 1
			`)
		);
		if (existing.length > 0) continue;

		try {
			const wcRows = rowsOf<{ id: number }>(
				await db.execute(sql`
					INSERT INTO ward_category (hospital_id, name, code, ward_markup, status_id, is_er)
					VALUES (${hospitalId}::uuid, 'Emergency', 'ER-DEMO-CAT', 0, ${StatusEnum.ACTIVE}, true)
					RETURNING id
				`)
			);
			const rcRows = rowsOf<{ id: number }>(
				await db.execute(sql`
					INSERT INTO room_category (hospital_id, name, code, room_markup, status_id, is_er)
					VALUES (${hospitalId}::uuid, 'Emergency bay', 'ER-DEMO-RC', 0, ${StatusEnum.ACTIVE}, true)
					RETURNING id
				`)
			);
			const wardRows = rowsOf<{ id: number }>(
				await db.execute(sql`
					INSERT INTO ward (
						hospital_id, branch_id, ward_category_id, name, code, status_id, is_er
					)
					VALUES (
						${hospitalId}::uuid,
						${branchId}::uuid,
						${wcRows[0]!.id},
						'Emergency Ward',
						'ER-DEMO',
						${StatusEnum.ACTIVE},
						true
					)
					RETURNING id
				`)
			);
			const roomRows = rowsOf<{ id: number }>(
				await db.execute(sql`
					INSERT INTO room (
						hospital_id, ward_id, room_category_id, name, code, capacity, status_id, is_er
					)
					VALUES (
						${hospitalId}::uuid,
						${wardRows[0]!.id},
						${rcRows[0]!.id},
						'Bay 1',
						'B1',
						0,
						${StatusEnum.ACTIVE},
						true
					)
					RETURNING id
				`)
			);
			const roomId = roomRows[0]!.id;
			for (let i = 1; i <= 6; i++) {
				await db.execute(sql`
					INSERT INTO bed (
						room_id, hospital_id, name, code, base_price, bed_status, status_id, is_er
					)
					VALUES (
						${roomId},
						${hospitalId}::uuid,
						${'Bed ' + i},
						${'B' + i},
						0,
						${IpdBedStatusEnum.FREE},
						${StatusEnum.ACTIVE},
						true
					)
				`);
			}
			seedLogger.info(`Seeded: demo ER beds for hospital ${hospitalId}`);
		} catch (e) {
			seedLogger.warn(
				`Skipped demo ER master for ${hospitalId}: ${e instanceof Error ? e.message : String(e)}`
			);
		}
	}
}
