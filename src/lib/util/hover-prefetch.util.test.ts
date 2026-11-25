import { afterEach, describe, expect, it } from 'vitest';
import {
	prefetchUrlsFor,
	rememberPageFetch,
	resetHoverPrefetch
} from '$lib/util/hover-prefetch.util';

const HOSPITAL = '01a0cd12-1af6-7839-a4ce-6d834497a0ba';
const MASTER_PAGE = `/medora/hospital/${HOSPITAL}/home/administration/departments`;
const LIVE_PAGE = `/medora/hospital/${HOSPITAL}/home/billing/bill`;
const NO_API_PAGE = `/medora/hospital/${HOSPITAL}/home/inventory/purchase-requisition/new`;

describe('prefetchUrlsFor', () => {
	afterEach(() => resetHoverPrefetch());

	it('falls back to the mirrored API path at default pagination', () => {
		expect(prefetchUrlsFor(MASTER_PAGE)).toEqual([
			`/api/medora/hospital/${HOSPITAL}/home/administration/departments?page=1&pageSize=25`
		]);
	});

	it('skips no-store pages so live data is never warmed', () => {
		expect(prefetchUrlsFor(LIVE_PAGE)).toEqual([]);
	});

	it('skips pages with no mirrored API route', () => {
		expect(prefetchUrlsFor(NO_API_PAGE)).toEqual([]);
	});

	it('skips mode-based APIs without page/pageSize list reads', () => {
		const approval = `/medora/hospital/${HOSPITAL}/home/inventory-setup/approval-config`;
		expect(prefetchUrlsFor(approval)).toEqual([]);
	});

	it('prefers the URL the page really opened with', () => {
		const real = `/api/medora/hospital/${HOSPITAL}/home/administration/departments?pageSize=10&page=1`;
		rememberPageFetch(MASTER_PAGE, real);
		expect(prefetchUrlsFor(MASTER_PAGE)).toEqual([real]);
	});
});

describe('rememberPageFetch', () => {
	afterEach(() => resetHoverPrefetch());

	it("ignores a read that is not the page's own API path", () => {
		rememberPageFetch(
			MASTER_PAGE,
			'/api/medora/master/lookup?kind=severity'
		);
		expect(prefetchUrlsFor(MASTER_PAGE)[0]).toContain(
			'/home/administration/departments?page=1'
		);
	});

	it('refuses to learn a no-store read', () => {
		rememberPageFetch(
			LIVE_PAGE,
			`/api/medora/hospital/${HOSPITAL}/home/billing/bill?page=1`
		);
		expect(prefetchUrlsFor(LIVE_PAGE)).toEqual([]);
	});

	it('keeps the first learned read for a page', () => {
		const first = `/api/medora/hospital/${HOSPITAL}/home/administration/departments?page=1&pageSize=10`;
		rememberPageFetch(MASTER_PAGE, first);
		rememberPageFetch(
			MASTER_PAGE,
			`/api/medora/hospital/${HOSPITAL}/home/administration/departments?page=2&pageSize=25`
		);
		expect(prefetchUrlsFor(MASTER_PAGE)).toEqual([first]);
	});
});
