import { describe, expect, it } from 'vitest';
import { StatusEnum } from '$lib/model/enum/db-link';
import {
	runWithRequestAuditUser,
	withRowInsertAudit,
	withRowUpdateAudit
} from '$lib/server/db';

const tableWithAudit = {
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
			{ name: 'x' },
			'user-1'
		);
		expect(row.createdBy).toBe('user-1');
		expect(row.updatedBy).toBe('user-1');
	});

	it('sets updatedBy on update and deletedBy when soft-deleting', () => {
		const row = withRowUpdateAudit(
			tableWithAudit,
			{ statusId: StatusEnum.DELETED },
			'user-2'
		);
		expect(row.updatedBy).toBe('user-2');
		expect(row.deletedBy).toBe('user-2');
		expect(row.deletedAt).toBeTruthy();
	});

	it('uses AsyncLocalStorage user when no explicit id', () => {
		runWithRequestAuditUser('user-als', () => {
			const row = withRowInsertAudit(tableWithAudit, { a: 1 });
			expect(row.createdBy).toBe('user-als');
		});
	});
});
