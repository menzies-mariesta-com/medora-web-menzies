import { describe, expect, it } from 'vitest';
import { medoraSectionIndexRedirectTarget } from '$lib/server/medora/nav/medora-section-index-redirect.server';

const HOSPITAL_ID = '01900000-0000-7000-8000-000000000001';

/** A genuine container-only index: its children are the tabs. */
const CONTAINER =
	'/medora/hospital/' +
	HOSPITAL_ID +
	'/home/adt/bed-transfer-requisition';

const containerPages = [
	{
		id: 700400,
		parentId: null,
		pageUrl: '/medora/home/adt/bed-transfer-requisition',
		sequenceNo: 4
	},
	{
		id: 700402,
		parentId: 700400,
		pageUrl: '/medora/home/adt/bed-transfer-requisition/list',
		sequenceNo: 2
	},
	{
		id: 700401,
		parentId: 700400,
		pageUrl: '/medora/home/adt/bed-transfer-requisition/new',
		sequenceNo: 1
	}
];

/**
 * The Dashboard page owns Journal / Visual as tabs. Journal is the section
 * index (sequenceNo 1), so the Dashboard URL redirects there and the Dashboard
 * tab stays visible with Journal highlighted.
 */
const DASHBOARD =
	'/medora/hospital/' +
	HOSPITAL_ID +
	'/home/nursing-workbench/patient-visit-history-dashboard';

const dashboardPages = [
	{
		id: 400108,
		parentId: 400100,
		pageUrl:
			'/medora/home/nursing-workbench/patient-visit-history-dashboard',
		sequenceNo: 1
	},
	{
		id: 400116,
		parentId: 400108,
		pageUrl:
			'/medora/home/nursing-workbench/patient-visit-history-dashboard/journal',
		sequenceNo: 1
	},
	{
		id: 400117,
		parentId: 400108,
		pageUrl:
			'/medora/home/nursing-workbench/patient-visit-history-dashboard/visual',
		sequenceNo: 2
	}
];

describe('medoraSectionIndexRedirectTarget', () => {
	it('targets the first child by sequenceNo', () => {
		expect(
			medoraSectionIndexRedirectTarget(
				CONTAINER,
				HOSPITAL_ID,
				containerPages
			)
		).toBe(
			`/medora/hospital/${HOSPITAL_ID}/home/adt/bed-transfer-requisition/new`
		);
	});

	it('keeps the query string so the selected visit survives', () => {
		expect(
			medoraSectionIndexRedirectTarget(
				CONTAINER,
				HOSPITAL_ID,
				containerPages,
				'?visitId=abc'
			)
		).toBe(
			`/medora/hospital/${HOSPITAL_ID}/home/adt/bed-transfer-requisition/new?visitId=abc`
		);
	});

	it('ignores the query when it is empty', () => {
		expect(
			medoraSectionIndexRedirectTarget(
				CONTAINER,
				HOSPITAL_ID,
				containerPages,
				'?'
			)
		).not.toContain('?');
	});

	it('returns null when the section has no children', () => {
		expect(
			medoraSectionIndexRedirectTarget(
				CONTAINER,
				HOSPITAL_ID,
				containerPages.filter((p) => p.id === 700400)
			)
		).toBeNull();
	});

	it('returns null for a leaf page or the hospital home', () => {
		expect(
			medoraSectionIndexRedirectTarget(
				`${CONTAINER}/new`,
				HOSPITAL_ID,
				containerPages
			)
		).toBeNull();
		expect(
			medoraSectionIndexRedirectTarget(
				`/medora/hospital/${HOSPITAL_ID}/home`,
				HOSPITAL_ID,
				containerPages
			)
		).toBeNull();
	});

	it('returns null without a hospital id', () => {
		expect(
			medoraSectionIndexRedirectTarget(CONTAINER, '', containerPages)
		).toBeNull();
	});

	/** Journal is the Dashboard's index page, so the index URL opens Journal. */
	it('sends the Dashboard index to its first child (Journal)', () => {
		expect(
			medoraSectionIndexRedirectTarget(
				DASHBOARD,
				HOSPITAL_ID,
				dashboardPages
			)
		).toBe(`${DASHBOARD}/journal`);
		expect(
			medoraSectionIndexRedirectTarget(
				DASHBOARD,
				HOSPITAL_ID,
				dashboardPages,
				'?visitId=abc'
			)
		).toBe(`${DASHBOARD}/journal?visitId=abc`);
	});

	it('still returns null on the Dashboard child tabs', () => {
		expect(
			medoraSectionIndexRedirectTarget(
				`${DASHBOARD}/visual`,
				HOSPITAL_ID,
				dashboardPages
			)
		).toBeNull();
	});

	it('skips children whose pageUrl is not under /medora/home', () => {
		const withDash = [
			...containerPages,
			{
				id: 700403,
				parentId: 700400,
				pageUrl: '-',
				sequenceNo: 0
			}
		];
		expect(
			medoraSectionIndexRedirectTarget(
				CONTAINER,
				HOSPITAL_ID,
				withDash
			)
		).toBe(
			`/medora/hospital/${HOSPITAL_ID}/home/adt/bed-transfer-requisition/new`
		);
	});
});
