import { describe, expect, it } from 'vitest';
import {
	DOCUMENT_STATUS_CONFLICT,
	assertRowsUpdated
} from '$lib/server/medora/workflow/status-transition.server';

describe('status-transition.server', () => {
	it('assertRowsUpdated throws 409 when empty', () => {
		try {
			assertRowsUpdated([]);
			expect.unreachable('expected throw');
		} catch (err: unknown) {
			expect(err).toMatchObject({ status: 409 });
			expect(String((err as { body?: { message?: string } }).body?.message ?? err)).toContain(
				'refresh'
			);
		}
	});

	it('assertRowsUpdated passes when row returned', () => {
		expect(() => assertRowsUpdated([{ id: 'x' }])).not.toThrow();
	});
});