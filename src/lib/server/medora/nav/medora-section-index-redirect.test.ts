import { describe, expect, it } from 'vitest';
import { medoraSectionIndexRedirectTarget } from '$lib/server/medora/nav/medora-section-index-redirect.server';

const HOSPITAL_ID = '01900000-0000-7000-8000-000000000001';
const SECTION = '/medora/hospital/' + HOSPITAL_ID + '/home/nursing-workbench/patient-visit-history-dashboard';

const pages = [
	{
		id: 400108,
		parentId: 400100,
		pageUrl:
			'/medora/home/nursing-workbench/patient-visit-history-dashboard',
		sequenceNo: 1
	},
	{
		id: 400117,
		parentId: 400108,
		pageUrl:
			'/medora/home/nursing-workbench/patient-visit-history-dashboard/visual',
		sequenceNo: 2
	},
	{
		id: 400116,
		parentId: 400108,
		pageUrl:
			'/medora/home/nursing-workbench/patient-visit-history-dashboard/journal',
		sequenceNo: 1
	}
];

describe('medoraSectionIndexRedirectTarget', () => {
	it('targets the first child by sequenceNo', () => {
		expect(
			medoraSectionIndexRedirectTarget(SECTION, HOSPITAL_ID, pages)
		).toBe(
			`/medora/hospital/${HOSPITAL_ID}/home/nursing-workbench/patient-visit-history-dashboard/journal`
		);
	});

	it('keeps the query string so the selected visit survives', () => {
		expect(
			medoraSectionIndexRedirectTarget(
				SECTION,
				HOSPITAL_ID,
				pages,
				'?visitId=abc'
			)
		).toBe(
			`/medora/hospital/${HOSPITAL_ID}/home/nursing-workbench/patient-visit-history-dashboard/journal?visitId=abc`
		);
	});

	it('ignores the query when it is empty', () => {
		expect(
			medoraSectionIndexRedirectTarget(SECTION, HOSPITAL_ID, pages, '?')
		).not.toContain('?');
	});

	it('returns null when the section has no children', () => {
		expect(
			medoraSectionIndexRedirectTarget(
				SECTION,
				HOSPITAL_ID,
				pages.filter((p) => p.id === 400108)
			)
		).toBeNull();
	});

	it('returns null for a leaf page or the hospital home', () => {
		const journal = `${SECTION}/journal`;
		expect(
			medoraSectionIndexRedirectTarget(journal, HOSPITAL_ID, pages)
		).toBeNull();
		expect(
			medoraSectionIndexRedirectTarget(
				`/medora/hospital/${HOSPITAL_ID}/home`,
				HOSPITAL_ID,
				pages
			)
		).toBeNull();
	});

	it('returns null without a hospital id', () => {
		expect(medoraSectionIndexRedirectTarget(SECTION, '', pages)).toBeNull();
	});
});
