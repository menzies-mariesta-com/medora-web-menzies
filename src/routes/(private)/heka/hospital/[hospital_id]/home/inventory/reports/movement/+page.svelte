<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiAlert from '$lib/component/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	type Row = {
		kind: string;
		refNo: string | null;
		storeId: number;
		storeName: string | null;
		itemId: number;
		itemName: string | null;
		batchNo: string | null;
		qty: string;
		createdAt: string | null;
	};

	let rows = $state<Row[]>([]);
	let loading = $state(false);
	let errorMessage = $state('');

	async function load() {
		if (!hospitalId) return;
		loading = true;
		errorMessage = '';
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/reports/movement`,
				{ method: 'GET' }
			);
			if (!res.ok) {
				throw new Error(
					`Request failed (${res.status} ${res.statusText || 'Error'})`
				);
			}
			const raw = (await res.json()) as Record<string, unknown>[];
			rows = raw.map((r) => ({
				kind: String(r.kind ?? ''),
				refNo: (r.refNo as string) ?? null,
				storeId: Number(r.storeId),
				storeName: (r.storeName as string) ?? null,
				itemId: Number(r.itemId),
				itemName: (r.itemName as string) ?? null,
				batchNo: (r.batchNo as string) ?? null,
				qty: String(r.qty ?? r.quantity ?? '0'),
				createdAt: (r.createdAt as string) ?? null
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
		void load();
	});

	const columns: MariTableColumn<Row>[] = [
		{
			id: 'kind',
			header: 'Kind',
			field: 'kind',
			format: (_v, row) => row.kind || '—'
		},
		{
			id: 'refNo',
			header: 'Ref no',
			field: 'refNo',
			format: (_v, row) => row.refNo ?? '—'
		},
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
			format: (_v, row) => row.batchNo ?? '—'
		},
		{
			id: 'qty',
			header: 'Qty',
			field: 'qty',
			format: (_v, row) => (row.qty ?? '').trim() || '—'
		},
		{
			id: 'createdAt',
			header: 'Created at',
			field: 'createdAt',
			format: (v) => v ?? '—'
		}
	];
</script>

<div
	class="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
>
	<h1 class="w-full text-lg font-semibold sm:mr-4 sm:w-auto">
		Stock movement
	</h1>
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
