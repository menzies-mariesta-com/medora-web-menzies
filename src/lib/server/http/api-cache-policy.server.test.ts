import { describe, expect, it } from 'vitest';
import {
	getApiCachePolicy,
	pathnameToApiTemplate
} from '$lib/server/http/api-cache-policy.server';
import { API_ROUTE_TIER_BY_TEMPLATE } from '$lib/server/http/api-route-cache-policy.generated';

describe('getApiCachePolicy', () => {
	it('covers all 207 generated route templates', () => {
		expect(Object.keys(API_ROUTE_TIER_BY_TEMPLATE).length).toBe(207);
	});

	it('denies live billing reads', () => {
		const policy = getApiCachePolicy(
			'/api/medora/hospital/01a0cd12-1af6-7839-a4ce-6d834497a0ba/home/billing/bill/bills',
			new URLSearchParams()
		);
		expect(policy.mode).toBe('no-store');
	});

	it('caches master admin route tier', () => {
		const policy = getApiCachePolicy(
			'/api/medora/hospital/01a0cd12-1af6-7839-a4ce-6d834497a0ba/home/administration/bed-master',
			new URLSearchParams()
		);
		expect(policy.mode).toBe('tiered');
		if (policy.mode === 'tiered') {
			expect(policy.ttlSeconds).toBe(300);
		}
	});

	it('caches master lookup route tier', () => {
		const template = pathnameToApiTemplate(
			'/api/medora/master/lookup'
		);
		expect(API_ROUTE_TIER_BY_TEMPLATE[template]).toBe('master-long');
	});

	it('boosts picker mode on inventory-setup', () => {
		const policy = getApiCachePolicy(
			'/api/medora/hospital/01a0cd12-1af6-7839-a4ce-6d834497a0ba/home/inventory-setup/stores',
			new URLSearchParams({ mode: 'allForPicker' })
		);
		expect(policy.mode).toBe('tiered');
		if (policy.mode === 'tiered') {
			expect(policy.ttlSeconds).toBe(180);
		}
	});

	it('maps runtime path to template', () => {
		expect(
			pathnameToApiTemplate(
				'/api/medora/hospital/01a0cd12-1af6-7839-a4ce-6d834497a0ba/home/dashboard'
			)
		).toBe('/api/medora/hospital/:hospital_id/home/dashboard');
	});
});