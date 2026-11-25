import { describe, expect, it } from 'vitest';

/**
 * Live-DB proof that the MLC register number is unique per branch.
 *
 * Before the branch segment was added to the MLC_NO format, the counter was
 * scoped per branch but the printed number was not, so a second branch would
 * regenerate the same string and collide on
 * `clinical_form_instance_mlc_no_uidx`.
 */
const HAS_DB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!HAS_DB)('MLC register number', () => {
	it('differs per branch and is never reused', async () => {
		const { ensureDb } = await import('$lib/server/db');
		const table = await import('$lib/server/db/schema');
		const { eq } = await import('drizzle-orm');
		const { generatePrefix } =
			await import('$lib/server/medora/prefix/prefix-generator.server');

		const db = ensureDb();
		const [hospital] = await db
			.select({ id: table.hospitalTable.id })
			.from(table.hospitalTable)
			.limit(1);
		if (!hospital) return;

		const branches = await db
			.select({ id: table.hospitalBranchTable.id })
			.from(table.hospitalBranchTable)
			.where(eq(table.hospitalBranchTable.hospitalId, hospital.id))
			.limit(2);
		if (branches.length < 2) return;

		const [fy] = await db
			.select({ id: table.financialYearTable.id })
			.from(table.financialYearTable)
			.where(eq(table.financialYearTable.hospitalId, hospital.id))
			.limit(1);
		if (!fy) return;

		const numbers: string[] = [];
		for (const branch of branches) {
			numbers.push(
				await generatePrefix({
					hospitalId: hospital.id,
					branchId: branch.id,
					financialYearId: fy.id,
					prefixKey: 'MLC_NO',
					context: {}
				})
			);
		}

		expect(numbers[0]).not.toBe(numbers[1]);
		// Consecutive calls in the same scope must also advance.
		const again = await generatePrefix({
			hospitalId: hospital.id,
			branchId: branches[0].id,
			financialYearId: fy.id,
			prefixKey: 'MLC_NO',
			context: {}
		});
		expect(again).not.toBe(numbers[0]);
	}, 30_000);
});
