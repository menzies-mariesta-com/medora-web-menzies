import { describe, expect, it } from 'vitest';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	runWithRequestAuditUser,
	withRowInsertAudit,
	withRowUpdateAudit
} from '$lib/server/db';

const tableWithAudit: Record<string, unknown> = {
	createdBy: {},
	updatedBy: {},
	deletedBy: {},
	deletedAt: {},
	statusId: {}
};

describe('DB audit injection helpers', () => {
	it('sets createdBy and updatedBy on insert', () => {
		const row = withRowInsertAudit(
			tableWithAudit,
			{ name: 'x' } as Record<string, unknown>,
			'user-1'
		);
		expect(row.createdBy).toBe('user-1');
		expect(row.updatedBy).toBe('user-1');
	});

	it('sets updatedBy on update and deletedBy when soft-deleting', () => {
		const row = withRowUpdateAudit(
			tableWithAudit,
			{ statusId: StatusEnum.DELETED } as Record<string, unknown>,
			'user-2'
		);
		expect(row.updatedBy).toBe('user-2');
		expect(row.deletedBy).toBe('user-2');
		expect(row.deletedAt).toBeTruthy();
	});

	it('uses AsyncLocalStorage user when no explicit id', () => {
		runWithRequestAuditUser('user-als', () => {
			const row = withRowInsertAudit(tableWithAudit, {
				a: 1
			} as Record<string, unknown>);
			expect(row.createdBy).toBe('user-als');
		});
	});
});
