import { describe, expect, it } from 'vitest';
import { pageRowsFrom, uniqueModulesFrom } from './page.state.svelte';
import type { PageWithRelations } from '$lib/model/type/medora/page.type';

function pageRow(
	id: number,
	moduleId: number | null,
	module: PageWithRelations['module']
): PageWithRelations {
	return {
		id,
		name: `page-${id}`,
		parentId: null,
		imageUrl: null,
		pageUrl: `/medora/home/p${id}`,
		sequenceNo: id,
		moduleId,
		statusId: 1,
		module,
		status: {
			id: 1,
			name: 'Active',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z'
		} as PageWithRelations['status']
	} as PageWithRelations;
}

const nursing: NonNullable<PageWithRelations['module']> = {
	id: 4,
	name: 'Nursing',
	imageUrl: 'heart-pulse',
	moduleUrl: '/medora/home/nursing-workbench',
	sequenceNo: 4,
	statusId: 1,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z'
} as NonNullable<PageWithRelations['module']>;

const billing: NonNullable<PageWithRelations['module']> = {
	...nursing,
	id: 8,
	name: 'Billing',
	moduleUrl: '/medora/home/billing'
};

describe('page nav shaping', () => {
	it('pageRowsFrom drops the module and status relations', () => {
		const [row] = pageRowsFrom([pageRow(1, 4, nursing)]);
		expect('module' in row).toBe(false);
		expect('status' in row).toBe(false);
		expect(row.moduleId).toBe(4);
		expect(row.pageUrl).toBe('/medora/home/p1');
	});

	it('uniqueModulesFrom dedupes by module id in first-seen order', () => {
		const modules = uniqueModulesFrom([
			pageRow(1, 4, nursing),
			pageRow(2, 8, billing),
			pageRow(3, 4, nursing)
		]);
		expect(modules.map((mod) => mod.id)).toEqual([4, 8]);
	});

	it('uniqueModulesFrom ignores pages without a module', () => {
		const modules = uniqueModulesFrom([
			pageRow(1, null, null),
			pageRow(2, 4, nursing)
		]);
		expect(modules.map((mod) => mod.id)).toEqual([4]);
	});

	it('returns no modules for an empty page list', () => {
		expect(uniqueModulesFrom([])).toEqual([]);
		expect(pageRowsFrom([])).toEqual([]);
	});
});
