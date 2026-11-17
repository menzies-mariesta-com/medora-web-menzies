import { describe, expect, it } from 'vitest';
import {
	PageActionEnum,
	DEFAULT_PAGE_ACTIONS,
	isPageAction
} from '$lib/model/enum/page-action.enum';
import { pageActionsFor } from '$lib/model/const/page-action-catalog.const';
import {
	ROUTE_PERMISSION,
	routeAction,
	routePageUrls
} from '$lib/server/medora/permission/page-permission-route-map.server';
import {
	apiHomeRouteKey,
	lookupRoutePermission
} from '$lib/server/http/page-permission-gate.server';
import {
	toPagePermissionFlags,
	type PageGrantMap
} from '$lib/server/medora/permission/page-permission.server';
import { hasAbsolutePermission } from '$lib/server/medora/permission/absolute-permission.server';
import { RoleEnum } from '$lib/model/enum/db-link';

describe('absolute permission', () => {
	it('grants owner, system admin and admin team', () => {
		expect(hasAbsolutePermission(RoleEnum.OWNER)).toBe(true);
		expect(hasAbsolutePermission(RoleEnum.SYSTEM_ADMIN)).toBe(true);
		expect(hasAbsolutePermission(RoleEnum.ADMIN_TEAM)).toBe(true);
	});

	it('excludes staff, patients and anonymous callers', () => {
		expect(hasAbsolutePermission(RoleEnum.STAFF)).toBe(false);
		expect(hasAbsolutePermission(RoleEnum.PATIENT)).toBe(false);
		expect(hasAbsolutePermission(null)).toBe(false);
		expect(hasAbsolutePermission(undefined)).toBe(false);
	});
});

describe('page action enum', () => {
	it('rejects unknown action codes', () => {
		expect(isPageAction('view')).toBe(true);
		expect(isPageAction('approve')).toBe(true);
		expect(isPageAction('root')).toBe(false);
		expect(isPageAction('')).toBe(false);
		expect(isPageAction(null)).toBe(false);
		expect(isPageAction(7)).toBe(false);
	});
});

describe('page action catalog', () => {
	it('falls back to CRUD for pages without an entry', () => {
		expect(
			pageActionsFor('/medora/home/administration/departments')
		).toEqual(DEFAULT_PAGE_ACTIONS);
	});

	it('gives inventory documents their workflow verbs', () => {
		const pr = pageActionsFor(
			'/medora/home/inventory/purchase-requisition'
		);
		expect(pr).toContain(PageActionEnum.APPROVE);
		expect(pr).toContain(PageActionEnum.CANCEL);
	});

	it('keeps read-only pages read-only', () => {
		const census = pageActionsFor(
			'/medora/home/nursing-workbench/census'
		);
		expect(census).not.toContain(PageActionEnum.CREATE);
		expect(census).not.toContain(PageActionEnum.DELETE);
	});
});

describe('route permission map', () => {
	it('resolves the API path to a map key', () => {
		expect(
			apiHomeRouteKey(
				'/api/medora/hospital/abc/home/inventory/purchase-requisition/approve'
			)
		).toBe('/inventory/purchase-requisition/approve');
		expect(apiHomeRouteKey('/api/medora/hospital/abc/home')).toBe(
			'/'
		);
		expect(apiHomeRouteKey('/api/medora/public/other')).toBeNull();
	});

	it('requires the domain action, not plain edit, for approvals', () => {
		const entry =
			ROUTE_PERMISSION['/inventory/purchase-requisition/approve'];
		expect(routeAction(entry, 'POST')).toBe(PageActionEnum.APPROVE);
		expect(routePageUrls(entry)).toContain(
			'/medora/home/inventory/purchase-requisition'
		);
	});

	it('maps writes to their CRUD action and reads to view', () => {
		const entry = ROUTE_PERMISSION['/administration/user-group'];
		expect(routeAction(entry, 'GET')).toBe(PageActionEnum.VIEW);
		expect(routeAction(entry, 'POST')).toBe(PageActionEnum.CREATE);
		expect(routeAction(entry, 'PUT')).toBe(PageActionEnum.EDIT);
		expect(routeAction(entry, 'DELETE')).toBe(PageActionEnum.DELETE);
	});

	it('only requires a session for own-account and home-wide routes', () => {
		expect(
			routeAction(ROUTE_PERMISSION['/account-settings'], 'PUT')
		).toBeNull();
		expect(
			routeAction(ROUTE_PERMISSION['/dashboard'], 'GET')
		).toBeNull();
		expect(routePageUrls(ROUTE_PERMISSION['/dashboard'])).toEqual([]);
	});

	it('denies an unmapped route (fail-closed contract)', () => {
		expect(ROUTE_PERMISSION['/not-a-real-route']).toBeUndefined();
		expect(
			lookupRoutePermission('/not-a-real-route')
		).toBeUndefined();
	});

	it('resolves dynamic segments to their bracket template', () => {
		const entry = lookupRoutePermission(
			'/administration/medication-order-setup/dose-unit'
		);
		expect(entry).toBe(
			ROUTE_PERMISSION[
				'/administration/medication-order-setup/[entity]'
			]
		);
		expect(
			lookupRoutePermission('/administration/medication-order-setup')
		).toBeUndefined();
	});

	it('never requires an action the page does not offer', () => {
		for (const [key, entry] of Object.entries(ROUTE_PERMISSION)) {
			if ('selfService' in entry || 'homeWide' in entry) continue;
			const offered = new Set(
				entry.pageUrls.flatMap((url) => pageActionsFor(url))
			);
			const required = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(
				(m) => routeAction(entry, m)
			);
			for (const action of required) {
				if (action === null) continue;
				expect(
					offered.has(action),
					`${key} needs ${action} which its page does not offer`
				).toBe(true);
			}
		}
	});
});

describe('client permission projection', () => {
	const pages = [
		{ id: 1, pageUrl: '/medora/home/a' },
		{ id: 2, pageUrl: '/medora/home/b' },
		{ id: 3, pageUrl: null }
	];

	it('projects only granted pages, dropping pages without a URL', () => {
		const grants: PageGrantMap = {
			1: [PageActionEnum.VIEW, PageActionEnum.EDIT],
			3: [PageActionEnum.VIEW]
		};
		expect(toPagePermissionFlags(grants, pages)).toEqual([
			{
				pageUrl: '/medora/home/a',
				actions: [PageActionEnum.VIEW, PageActionEnum.EDIT]
			}
		]);
	});

	it('yields nothing for a staff member with no grants', () => {
		expect(toPagePermissionFlags({}, pages)).toEqual([]);
	});
});
