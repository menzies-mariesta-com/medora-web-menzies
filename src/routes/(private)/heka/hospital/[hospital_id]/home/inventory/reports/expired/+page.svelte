<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	type Mode = 'expired' | 'expiringSoon';
	let mode = $state<Mode>('expired');
	const daysSoon = 30;

	type Row = {
		storeId: number;
		storeName: string | null;
		itemId: number;
		itemName: string | null;
		batchNo: string;
		expiryDate: string | null;
		qty: string;
	};

	let rows = $state<Row[]>([]);
	let loading = $state(false);
	let errorMessage = $state('');

	async function load() {
		if (!hospitalId) return;
		loading = true;
		errorMessage = '';
		try {
			const sp = new SvelteURLSearchParams();
			sp.set('mode', mode);
			if (mode === 'expiringSoon')
				sp.set('daysSoon', String(daysSoon));

			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/reports/expired?${sp.toString()}`,
				{ method: 'GET' }
			);
			if (!res.ok) {
				throw new Error(
					`Request failed (${res.status} ${res.statusText || 'Error'})`
				);
			}
			const raw = (await res.json()) as Record<string, unknown>[];
			rows = raw.map((r) => ({
				storeId: Number(r.storeId),
				storeName: (r.storeName as string) ?? null,
				itemId: Number(r.itemId),
				itemName: (r.itemName as string) ?? null,
				batchNo: String(r.batchNo ?? ''),
				expiryDate: (r.expiryDate as string) ?? null,
				qty: String(r.qty ?? r.quantity ?? '0')
			}));
		} catch (e) {
			errorMessage =
				e instanceof Error ? e.message : 'Failed to load';
			rows = [];
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void mode;
		void load();
	});

	const columns: MariTableColumn<Row>[] = [
		{
			id: 'storeName',
			header: m.inv_common_store(),
			field: 'storeName',
			format: (_v, row) => row.storeName ?? '—'
		},
		{
			id: 'itemName',
			header: 'Item',
			field: 'itemName',
			format: (_v, row) => row.itemName ?? '—'
		},
		{
			id: 'batchNo',
			header: m.inv_stock_col_batch(),
			field: 'batchNo',
			format: (_v, row) => row.batchNo || '—'
		},
		{
			id: 'expiryDate',
			header: m.inv_stock_col_expiry(),
			field: 'expiryDate',
			format: (v) => v ?? '—'
		},
		{
			id: 'qty',
			header: 'Qty',
			field: 'qty',
			format: (_v, row) => (row.qty ?? '').trim() || '—'
		}
	];
</script>

<div
	class="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
>
	<h1 class="w-full text-lg font-semibold sm:mr-4 sm:w-auto">
		Expired / expiring lots
	</h1>
	<div class="join">
		<DaisyUiButton
			type="button"
			className="join-item d-btn-sm {mode === 'expired'
				? 'd-btn-primary'
				: 'd-btn-outline'}"
			disabled={loading}
			onClick={() => {
				mode = 'expired';
			}}
		>
			Expired
		</DaisyUiButton>
		<DaisyUiButton
			type="button"
			className="join-item d-btn-sm {mode === 'expiringSoon'
				? 'd-btn-primary'
				: 'd-btn-outline'}"
			disabled={loading}
			onClick={() => {
				mode = 'expiringSoon';
			}}
		>
			Expiring soon ({daysSoon} days)
		</DaisyUiButton>
	</div>
</div>

{#if errorMessage}
	<div class="mb-3">
		<DaisyUiAlert
			type={StatusColorEnum.ERROR}
			message="Failed to load report"
			detail={errorMessage}
		/>
	</div>
{/if}

<DaisyUiCard>
	<DaisyUiCardBody className="p-0">
		<div class={TableEnum.HEIGHT}>
			<MariTable
				{columns}
				{rows}
				isLoading={loading}
				showRefreshButton={false}
			/>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>
