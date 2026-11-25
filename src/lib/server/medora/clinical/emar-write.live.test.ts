import { describe, expect, it } from 'vitest';

/**
 * Live-DB proof for the eMAR write guards. Every assertion is a rule that would
 * silently corrupt the record if it regressed, so each one is exercised against
 * the real table and rolled back by deleting the rows it created.
 */
const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)('eMAR write guards (live)', () => {
	it('rejects an unexplained omission and an unknown reason code', async () => {
		const emar = await import('$lib/server/medora/clinical/emar.server');
		const { ensureDb } = await import('$lib/server/db');
		const table = await import('$lib/server/db/schema');
		const { and, desc, eq, isNull } = await import('drizzle-orm');
		const db = ensureDb();

		const [seed] = await db
			.select({
				hospitalId: table.medicationOrderBatchTable.hospitalId,
				visitId: table.medicationOrderBatchTable.visitId,
				lineId: table.medicationOrderLineTable.id,
				staffId: table.staffHospitalTable.staffId
			})
			.from(table.medicationOrderLineTable)
			.innerJoin(
				table.medicationOrderBatchTable,
				eq(table.medicationOrderLineTable.batchId, table.medicationOrderBatchTable.id)
			)
			.innerJoin(
				table.staffHospitalTable,
				eq(table.staffHospitalTable.hospitalId, table.medicationOrderBatchTable.hospitalId)
			)
			.where(
				and(
					isNull(table.medicationOrderLineTable.deletedAt),
					isNull(table.medicationOrderBatchTable.deletedAt)
				)
			)
			.orderBy(desc(table.medicationOrderLineTable.id))
			.limit(1);
		if (!seed?.visitId) return;

		const base = {
			hospitalId: seed.hospitalId,
			visitId: seed.visitId,
			scheduleId: null,
			lineId: seed.lineId,
			scannedPatientToken: '',
			scannedProductBarcode: '',
			scannedNurseCode: '',
			nurseStaffId: seed.staffId
		};

		/** `error(400, …)` carries its text on `body.message`, not `message`. */
		const rejection = async (promise: Promise<unknown>) => {
			try {
				await promise;
			} catch (err) {
				return (err as { status?: number; body?: { message?: string } });
			}
			throw new Error('expected the call to be rejected');
		};

		const noReason = await rejection(
			emar.recordAdministration({ ...base, status: 'held' })
		);
		expect(noReason.status).toBe(400);
		expect(noReason.body?.message).toMatch(/reason is required/i);

		const badReason = await rejection(
			emar.recordAdministration({
				...base,
				status: 'held',
				lateReason: 'made_up_reason'
			})
		);
		expect(badReason.status).toBe(400);
		expect(badReason.body?.message).toMatch(/Unknown reason code/i);

		// A given dose without the scans is refused before anything is written.
		const noScans = await rejection(
			emar.recordAdministration({ ...base, status: 'given' })
		);
		expect(noScans.status).toBe(400);
		expect(noScans.body?.message).toMatch(/BCMA requires/i);
	});

	it('records infusion start/stop as markers with no due dose', async () => {
		const emar = await import('$lib/server/medora/clinical/emar.server');
		const { ensureDb } = await import('$lib/server/db');
		const table = await import('$lib/server/db/schema');
		const { and, desc, eq, isNull } = await import('drizzle-orm');
		const db = ensureDb();

		const [seed] = await db
			.select({
				hospitalId: table.medicationOrderBatchTable.hospitalId,
				visitId: table.medicationOrderBatchTable.visitId,
				lineId: table.medicationOrderLineTable.id,
				staffId: table.staffHospitalTable.staffId
			})
			.from(table.medicationOrderLineTable)
			.innerJoin(
				table.medicationOrderBatchTable,
				eq(table.medicationOrderLineTable.batchId, table.medicationOrderBatchTable.id)
			)
			.innerJoin(
				table.staffHospitalTable,
				eq(table.staffHospitalTable.hospitalId, table.medicationOrderBatchTable.hospitalId)
			)
			.where(
				and(
					isNull(table.medicationOrderLineTable.deletedAt),
					isNull(table.medicationOrderBatchTable.deletedAt)
				)
			)
			.orderBy(desc(table.medicationOrderLineTable.id))
			.limit(1);
		if (!seed?.visitId) return;

		const created: number[] = [];
		try {
			const start = await emar.recordInfusionEvent({
				hospitalId: seed.hospitalId,
				visitId: seed.visitId,
				lineId: seed.lineId,
				kind: 'start',
				nurseStaffId: seed.staffId
			});
			created.push(start.id);
			expect(start.scheduleId).toBeNull();
			expect(start.administrationStatus).toBe('infusion_start');

			const stop = await emar.recordInfusionEvent({
				hospitalId: seed.hospitalId,
				visitId: seed.visitId,
				lineId: seed.lineId,
				kind: 'stop',
				nurseStaffId: seed.staffId
			});
			created.push(stop.id);
			expect(stop.administrationStatus).toBe('infusion_stop');

			// The charted dose list surfaces both markers; the MAR reads the last one.
			const charted = await emar.getEmarMar({
				hospitalId: seed.hospitalId,
				visitId: seed.visitId,
				from: new Date(Date.now() - 3_600_000).toISOString(),
				to: new Date(Date.now() + 3_600_000).toISOString()
			});
			const mine = charted.administrations.filter((row) =>
				created.includes(row.id)
			);
			expect(mine).toHaveLength(2);
		} finally {
			if (created.length) {
				const { inArray } = await import('drizzle-orm');
				await db
					.delete(table.medicationAdministrationTable)
					.where(inArray(table.medicationAdministrationTable.id, created));
			}
		}
	});
});
