import { describe, expect, it, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MenziesTable from './MenziesTable.svelte';

/**
 * Regression: the master-filter `$effect` reads AND writes `masterFilterOptions`.
 * Reading it as a dependency re-triggered the effect on every write, refetching
 * forever (the "over 1000 lines of Uncaught (in promise)" report).
 */
describe('MenziesTable master filter options', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('fetches master filter options exactly once, not in a loop', async () => {
		const fetchMock = vi.fn(
			async () =>
				new Response(JSON.stringify([{ id: 1, name: 'Follow-up' }]), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
		);
		vi.stubGlobal('fetch', fetchMock);

		render(MenziesTable, {
			rows: [{ id: 1 }],
			columns: [
				{
					id: 'visitType',
					header: 'Visit Type',
					filterable: true,
					filterType: 'select',
					filterMasterKey: 'visitType',
					field: 'visitType.name'
				}
			],
			enableColumnFilters: true,
			masterFilterHospitalId: 'h1'
		});

		// Let the effect (and any runaway re-runs) settle.
		await new Promise((resolve) => setTimeout(resolve, 300));

		expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(1);
	});
});
