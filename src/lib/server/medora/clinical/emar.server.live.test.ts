import { describe, expect, it } from 'vitest';
import { planDosesForWindow } from '$lib/tool/nursing/emar-dose-plan.util';

/**
 * Live-DB proof for the eMAR read/write path: doses materialise and a repeat
 * read of the same window adds nothing. Runs only when a database is reachable,
 * and skips itself when the dev database holds no medication order lines.
 */
const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)('eMAR live database', () => {
	it('materialises due doses once, then reads them back without duplicates', async () => {
		const { ensureDb } = await import('$lib/server/db');
		const table = await import('$lib/server/db/schema');
		const emar = await import('$lib/server/medora/clinical/emar.server');
		const { and, desc, eq, isNull } = await import('drizzle-orm');
		const db = ensureDb();

		const [seed] = await db
			.select({
				hospitalId: table.medicationOrderBatchTable.hospitalId,
				visitId: table.medicationOrderBatchTable.visitId,
				startAt: table.medicationOrderLineTable.startAt
			})
			.from(table.medicationOrderLineTable)
			.innerJoin(
				table.medicationOrderBatchTable,
				eq(table.medicationOrderLineTable.batchId, table.medicationOrderBatchTable.id)
			)
			.where(
				and(
					isNull(table.medicationOrderLineTable.deletedAt),
					isNull(table.medicationOrderBatchTable.deletedAt)
				)
			)
			.orderBy(desc(table.medicationOrderLineTable.id))
			.limit(1);

		if (!seed?.visitId) {
			// No order lines in this database: nothing to prove here.
			return;
		}

		const start = new Date(seed.startAt);
		const input = {
			hospitalId: seed.hospitalId,
			visitId: seed.visitId,
			from: new Date(start.getTime() - 86_400_000).toISOString(),
			to: new Date(start.getTime() + 86_400_000).toISOString()
		};

		await emar.ensureSchedulesForVisit(input);
		const first = await emar.getEmarMar(input);
		await emar.ensureSchedulesForVisit(input);
		const second = await emar.getEmarMar(input);

		expect(second.schedules.length).toBe(first.schedules.length);
		const keys = second.schedules.map((row) => `${row.lineId}:${row.scheduledAt}`);
		expect(new Set(keys).size).toBe(keys.length);
		expect(second.patient.name.length).toBeGreaterThan(0);
	});

	it('plans nothing for a PRN line', () => {
		expect(
			planDosesForWindow({
				lines: [
					{
						lineId: 1,
						startAt: '2026-11-05T09:41:00.000Z',
						durationValue: '1',
						durationUnitId: 1,
						frequencyAbbreviation: 'PRN',
						frequencyPerDay: '1',
						orderTypeName: 'PRN',
						infusionType: null
					}
				],
				durUnits: [{ id: 1, code: 'minute' }],
				from: '2026-11-05T00:00:00.000Z',
				to: '2026-11-07T00:00:00.000Z'
			})
		).toEqual([]);
	});
});
