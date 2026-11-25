import { describe, expect, it } from 'vitest';

/**
 * Live-DB proof of the MLC write path: a draft takes a register number, signing
 * locks it, and an addendum attaches without touching the parent.
 *
 * Rows created here are deleted at the end. Skips when no ED visit exists.
 */
const HAS_DB = Boolean(process.env.DATABASE_URL);

const SIGNED = {
	incident_datetime: '2026-11-20T10:00:00.000Z',
	incident_location: 'Live test',
	police_station: 'Live test station',
	alleged_history: 'Live test history',
	consciousness_state: 'oriented',
	exam_general: 'Live test general exam',
	exam_injuries: [
		{ region: 'Left forearm', nature: 'abrasion', size: '2 cm' }
	],
	opinion: 'Live test opinion',
	doctor_signature: 'Dr Live Test',
	doctor_signed_at: '2026-11-25T09:00:00.000Z',
	witness_name: 'Nurse Live Test',
	witness_signature: 'Nurse Live Test',
	witness_signed_at: '2026-11-25T09:01:00.000Z'
};

describe.skipIf(!HAS_DB)('MLC live write path', () => {
	it('drafts, signs, then amends without mutating the parent', async () => {
		const { ensureDb } = await import('$lib/server/db');
		const table = await import('$lib/server/db/schema');
		const { and, eq } = await import('drizzle-orm');
		const mlc =
			await import('$lib/server/medora/mlc-documentation/mlc-documentation.server');

		const db = ensureDb();
		const [visit] = await db
			.select({
				hospitalId: table.patientVisitTable.hospitalId,
				visitId: table.patientVisitTable.id
			})
			.from(table.patientVisitTable)
			.limit(1);
		if (!visit) return;

		const [template] = await db
			.select({ id: table.clinicalFormTemplateTable.id })
			.from(table.clinicalFormTemplateTable)
			.where(
				eq(
					table.clinicalFormTemplateTable.code,
					mlc.MLC_TEMPLATE_CODE
				)
			)
			.limit(1);
		// Template rows are inserted lazily by getTemplateByCode; ensure first.
		if (!template) {
			await mlc.getMlcBootstrap({
				hospitalId: visit.hospitalId,
				visitId: visit.visitId,
				staffId: null
			});
		}

		const [staff] = await db
			.select({ id: table.staffTable.id })
			.from(table.staffTable)
			.limit(1);
		if (!staff) return;

		const created: number[] = [];
		try {
			const draft = await mlc.saveMlcDraft({
				hospitalId: visit.hospitalId,
				visitId: visit.visitId,
				valuesJson: { incident_location: 'Live test' },
				staffId: null
			});
			created.push(draft.id);
			expect(draft.formNumber).toBeTruthy();
			expect(draft.parentInstanceId).toBeNull();

			// A second draft save must reuse the same register number.
			const resaved = await mlc.saveMlcDraft({
				hospitalId: visit.hospitalId,
				visitId: visit.visitId,
				valuesJson: { incident_location: 'Live test 2' },
				staffId: null,
				id: draft.id
			});
			expect(resaved.formNumber).toBe(draft.formNumber);

			// Signing without the attestation fields is refused.
			await expect(
				mlc.signMlc({
					hospitalId: visit.hospitalId,
					visitId: visit.visitId,
					id: draft.id,
					valuesJson: { incident_location: 'Live test' },
					staffId: staff.id
				})
			).rejects.toThrow();

			// An addendum on a draft is refused.
			await expect(
				mlc.createMlcAddendum({
					hospitalId: visit.hospitalId,
					visitId: visit.visitId,
					parentInstanceId: draft.id,
					valuesJson: SIGNED,
					staffId: staff.id
				})
			).rejects.toThrow();

			const signed = await mlc.signMlc({
				hospitalId: visit.hospitalId,
				visitId: visit.visitId,
				id: draft.id,
				valuesJson: { incident_location: 'Live test', ...SIGNED },
				staffId: staff.id
			});
			expect(signed.signedAt).toBeTruthy();
			expect(signed.formNumber).toBe(draft.formNumber);

			// A signed record refuses further edits.
			await expect(
				mlc.saveMlcDraft({
					hospitalId: visit.hospitalId,
					visitId: visit.visitId,
					valuesJson: {},
					staffId: null,
					id: draft.id
				})
			).rejects.toThrow();

			const addendum = await mlc.createMlcAddendum({
				hospitalId: visit.hospitalId,
				visitId: visit.visitId,
				parentInstanceId: draft.id,
				valuesJson: {
					...SIGNED,
					addendum_reason: 'Live test correction'
				},
				staffId: staff.id
			});
			created.push(addendum.id);
			expect(addendum.parentInstanceId).toBe(draft.id);

			// The parent keeps its signed state and its values.
			const [parent] = await db
				.select()
				.from(table.clinicalFormInstanceTable)
				.where(
					and(
						eq(table.clinicalFormInstanceTable.id, draft.id),
						eq(
							table.clinicalFormInstanceTable.hospitalId,
							visit.hospitalId
						)
					)
				);
			expect(parent.statusTaggingId).toBe(80);
			expect(
				(parent.valuesJson as Record<string, unknown>).addendum_reason
			).toBeUndefined();
		} finally {
			// Delete the addendum before the parent: the FK is ON DELETE SET NULL,
			// so either order works, but this keeps intent obvious.
			for (const id of created.reverse()) {
				await db
					.delete(table.clinicalFormInstanceTable)
					.where(eq(table.clinicalFormInstanceTable.id, id));
			}
		}
	}, 60_000);
});
