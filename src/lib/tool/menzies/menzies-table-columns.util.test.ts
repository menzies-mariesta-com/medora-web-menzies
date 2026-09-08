import { describe, expect, it } from 'vitest';
import {
	isMenziesTableDatabaseIdColumn,
	isMenziesTableRowNumberColumn,
	normalizeMenziesTableColumns
} from './menzies-table-columns.util';
import type { MenziesTableColumn } from '$lib/component/own/library/menzies/table/MenziesTable.svelte';

describe('menzies-table-columns.util', () => {
	it('detects row number columns', () => {
		expect(
			isMenziesTableRowNumberColumn({ id: 'no', header: 'No.' })
		).toBe(true);
		expect(
			isMenziesTableRowNumberColumn({
				id: 'id',
				header: 'No.',
				format: (_v, _r, i) => i + 1
			})
		).toBe(true);
	});

	it('detects database id columns', () => {
		expect(
			isMenziesTableDatabaseIdColumn({ id: 'id', header: 'ID', field: 'id' })
		).toBe(true);
		expect(
			isMenziesTableDatabaseIdColumn({
				id: 'hospitalId',
				header: 'Hospital',
				field: 'hospitalId'
			})
		).toBe(true);
	});

	it('keeps resolved-name columns', () => {
		expect(
			isMenziesTableDatabaseIdColumn({
				id: 'storeId',
				header: 'Store',
				field: 'storeId',
				format: (_v, row) => (row as { storeName?: string }).storeName ?? '—'
			})
		).toBe(false);
		expect(
			isMenziesTableDatabaseIdColumn({
				id: 'visitNo',
				header: 'Visit no.',
				field: 'visitNo'
			})
		).toBe(false);
		expect(
			isMenziesTableDatabaseIdColumn({
				id: 'createdByName',
				header: 'Created by',
				field: 'createdByName'
			})
		).toBe(false);
	});

	it('prepends No. and strips id columns', () => {
		const input: MenziesTableColumn[] = [
			{ id: 'id', header: 'ID', field: 'id' },
			{ id: 'name', header: 'Name', field: 'name' }
		];
		const out = normalizeMenziesTableColumns(input, {
			currentPage: 2,
			pageSize: 10
		});
		expect(out).toHaveLength(2);
		expect(out[0]?.id).toBe('no');
		expect(out[1]?.id).toBe('name');
	});

	it('replaces visitId with visitNo when visitNo is missing', () => {
		const input: MenziesTableColumn[] = [
			{ id: 'visitId', header: 'Visit ID', field: 'visitId' },
			{ id: 'batchNo', header: 'Batch', field: 'batchNo' }
		];
		const out = normalizeMenziesTableColumns(input, {
			currentPage: 1,
			pageSize: 25
		});
		expect(out.some((c) => c.id === 'visitId')).toBe(false);
		expect(out.some((c) => c.id === 'visitNo')).toBe(true);
		expect(out.some((c) => c.id === 'createdBy')).toBe(false);
	});

	it('keeps createdByName when stripping createdBy', () => {
		const input: MenziesTableColumn[] = [
			{
				id: 'createdByName',
				header: 'Created by',
				field: 'createdByName'
			},
			{
				id: 'createdBy',
				header: 'Created by (user id)',
				field: 'createdBy'
			}
		];
		const out = normalizeMenziesTableColumns(input, {
			currentPage: 1,
			pageSize: 25
		});
		expect(out.filter((c) => c.id === 'createdByName')).toHaveLength(1);
		expect(out.some((c) => c.id === 'createdBy')).toBe(false);
	});
});
