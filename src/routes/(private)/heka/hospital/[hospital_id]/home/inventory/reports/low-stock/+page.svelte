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
		storeId: number;
		storeName: string | null;
		itemId: number;
		itemName: string | null;
		qty: string;
		minQty: string;
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
				`/api/heka/hospital/${hospitalId}/home/inventory/reports/low-stock?limit=500`,
				{ method: 'GET', cache: 'no-store' }
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
				qty: String(r.qty ?? r.quantity ?? '0'),
				minQty: String(r.minQty ?? '0')
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
			id: 'qty',
			header: 'Qty',
			field: 'qty',
			format: (_v, row) => (row.qty ?? '').trim() || '—'
		},
		{
			id: 'minQty',
			header: 'Min qty',
			field: 'minQty',
			format: (_v, row) => (row.minQty ?? '').trim() || '—'
		}
	];
</script>

<div
	class="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
>
	<h1 class="w-full text-lg font-semibold sm:mr-4 sm:w-auto">
		Low stock
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
