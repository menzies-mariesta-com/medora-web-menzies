import { describe, expect, it } from 'vitest';
import {
	pathnameToApiTemplate,
	sortedQuery
} from '$lib/util/api-route-template.util';

describe('pathnameToApiTemplate', () => {
	it('collapses a hospital UUID to :hospital_id', () => {
		expect(
			pathnameToApiTemplate(
				'/api/medora/hospital/01a0cd12-1af6-7839-a4ce-6d834497a0ba/home/dashboard'
			)
		).toBe('/api/medora/hospital/:hospital_id/home/dashboard');
	});

	it('collapses numeric ids to :id', () => {
		expect(pathnameToApiTemplate('/api/medora/admin/team/42')).toBe(
			'/api/medora/admin/team/:id'
		);
	});

	it('leaves a route group in the path untouched (runtime URLs never contain one)', () => {
		expect(
			pathnameToApiTemplate(
				'/api/(private)/medora/hospital/01a0cd12-1af6-7839-a4ce-6d834497a0ba/home/x'
			)
		).toBe('/api/(private)/medora/hospital/:hospital_id/home/x');
	});
});

describe('sortedQuery', () => {
	it('treats reordered params as the same query', () => {
		expect(sortedQuery('?page=1&pageSize=25')).toBe(
			sortedQuery('?pageSize=25&page=1')
		);
	});

	it('sorts repeated values and keeps both', () => {
		expect(sortedQuery('?id=2&id=1')).toBe('id=1&id=2');
	});

	it('drops the leading ? in the result', () => {
		expect(sortedQuery('?b=2&a=1')).toBe('a=1&b=2');
	});
});
