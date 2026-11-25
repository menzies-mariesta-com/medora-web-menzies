import { describe, expect, it } from 'vitest';
import { getApiCachePolicy } from '$lib/server/http/api-cache-policy.server';
import { pathnameToApiTemplate } from '$lib/util/api-route-template.util';
import { API_ROUTE_TIER_BY_TEMPLATE } from '$lib/util/api-route-tier.generated';

describe('getApiCachePolicy', () => {
	it('assigns a known tier to every generated route template', () => {
		const tiers = new Set(Object.values(API_ROUTE_TIER_BY_TEMPLATE));
		expect(tiers.size).toBeGreaterThan(0);
		for (const tier of tiers) {
			expect(typeof tier).toBe('string');
		}
		// Nursing chart reads are live clinical data.
		expect(
			API_ROUTE_TIER_BY_TEMPLATE[
				'/api/medora/hospital/:hospital_id/home/nursing-workbench/emr/patient-visit-history-dashboard/visual'
			]
		).toBe('no-store');
	});

	it('denies live billing reads', () => {
		const policy = getApiCachePolicy(
			'/api/medora/hospital/01a0cd12-1af6-7839-a4ce-6d834497a0ba/home/billing/bill/bills',
			new URLSearchParams()
		);
		expect(policy.mode).toBe('no-store');
	});

	it('denies caching of MLC medico-legal records', () => {
		expect(
			API_ROUTE_TIER_BY_TEMPLATE[
				'/api/medora/hospital/:hospital_id/home/mlc-documentation'
			]
		).toBe('no-store');

		const policy = getApiCachePolicy(
			'/api/medora/hospital/01a0cd12-1af6-7839-a4ce-6d834497a0ba/home/mlc-documentation',
			new URLSearchParams({ mode: 'bootstrap' })
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
