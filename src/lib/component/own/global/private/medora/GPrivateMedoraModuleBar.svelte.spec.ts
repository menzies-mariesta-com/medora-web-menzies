import { describe, expect, it, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GPrivateMedoraModuleBar from './GPrivateMedoraModuleBar.svelte';
import type { MedoraPageModuleRow } from '$lib/model/type/medora/page.type';

/**
 * Regression: the hospital home layout fed the module bar from a module-level
 * store written inside an `$effect`, so the bar rendered at least one flush with
 * an empty `moduleList` — the "chrome missing until I refresh" report.
 */
const modules: MedoraPageModuleRow[] = [
	{
		id: 4,
		name: 'Nursing',
		imageUrl: 'heart-pulse',
		moduleUrl: '/medora/home/nursing-workbench',
		sequenceNo: 4,
		statusId: 1
	} as MedoraPageModuleRow,
	{
		id: 8,
		name: 'Billing',
		imageUrl: 'receipt-text',
		moduleUrl: '/medora/home/billing',
		sequenceNo: 8,
		statusId: 1
	} as MedoraPageModuleRow
];

function moduleButtonLabels(container: HTMLElement): string[] {
	return [...container.querySelectorAll('[data-module-bar-scroll] button')].map(
		(button) => button.textContent?.trim() ?? ''
	);
}

describe('GPrivateMedoraModuleBar first render', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('renders module buttons on the first render from props alone', () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('{}', { status: 200 }))
		);

		const { container } = render(GPrivateMedoraModuleBar, {
			hospitalId: 'h1',
			moduleList: modules,
			pageList: []
		});

		expect(moduleButtonLabels(container)).toEqual(['Nursing', 'Billing']);
	});

	it('renders no module buttons when the list is empty', () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('{}', { status: 200 }))
		);

		const { container } = render(GPrivateMedoraModuleBar, {
			hospitalId: 'h1',
			moduleList: [],
			pageList: []
		});

		expect(moduleButtonLabels(container)).toEqual([]);
	});
});
