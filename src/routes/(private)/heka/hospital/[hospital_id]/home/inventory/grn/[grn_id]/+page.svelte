<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import {
		trimInventoryNumericDisplay,
		trimMetricQtyDisplay
	} from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import { StringUtil } from '$lib/util/string.util.svelte';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	const grnId = $derived(
		typeof page.params.grn_id === 'string' ? page.params.grn_id : ''
	);

	const grnListPath = $derived(
		hekaHospitalPageUrl(hospitalId, '/heka/home/inventory/grn' as any)
	);

	const toastService = new ToastService();

	type GrnDetailLine = {
		id: number;
		itemName?: string | null;
		receivedQty: string;
		unitName?: string | null;
		batchNo?: string | null;
		expiryDate?: string | null;
		purchasePrice?: string | null;
	};

	type GrnDetail = {
		id: string;
		storeName?: string | null;
		supplierName?: string | null;
		receivedDate: string;
		statusName?: string | null;
		receivedByName?: string | null;
		invoiceNo?: string | null;
		invoiceDate?: string | null;
		invoiceAmount?: string | null;
		invoicePhotoUrl?: string | null;
		createdAt?: string | null;
		updatedAt?: string | null;
		createdByName?: string | null;
		updatedByName?: string | null;
		cancelledAt?: string | null;
		cancelledByName?: string | null;
		lines: GrnDetailLine[];
	};

	let detail = $state<GrnDetail | null>(null);
	let detailLoading = $state(true);

	let abort: AbortController | null = null;

	const lineColumns: MariTableColumn<GrnDetailLine>[] = [
		{
			id: 'itemName',
			header: m.inv_common_item(),
			field: 'itemName',
			format: (_v, row) => row.itemName ?? '—'
		},
		{
			id: 'receivedQty',
			header: m.inv_common_quantity(),
			field: 'receivedQty',
			format: (_v, row) => {
				const t = row.receivedQty?.trim();
				return t ? trimMetricQtyDisplay(t) : '—';
			}
		},
		{
			id: 'unitName',
			header: m.inv_common_unit(),
			field: 'unitName',
			format: (_v, row) => row.unitName ?? '—'
		},
		{
			id: 'batchNo',
			header: 'Batch No',
			field: 'batchNo',
			format: (_v, row) => row.batchNo ?? '—'
		},
		{
			id: 'expiryDate',
			header: 'Expiry Date',
			field: 'expiryDate',
			format: (_v, row) => row.expiryDate ?? '—'
		},
		{
			id: 'purchasePrice',
			header: 'Purchase Price',
			field: 'purchasePrice',
			format: (_v, row) => {
				const t = String(row.purchasePrice ?? '').trim();
				return t ? trimInventoryNumericDisplay(t, 4) : '—';
			}
		}
	];

	async function loadDetail() {
		if (!hospitalId || !grnId) return;
		abort?.abort();
		abort = new AbortController();
		detailLoading = true;
		try {
			const sp = new URLSearchParams();
			sp.set('id', grnId);
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/grn?${sp.toString()}`,
				{ method: 'GET', signal: abort.signal }
			);
			if (!res.ok) {
				toastService.addToast(
					'Could not load GRN detail',
					StatusColorEnum.ERROR,
					`HTTP ${res.status}`
				);
				detail = null;
				return;
			}
			detail = (await res.json()) as GrnDetail;
		} catch (e) {
			if ((e as { name?: string }).name === 'AbortError') return;
			toastService.addErrorToast('Could not load GRN detail', e);
			detail = null;
		} finally {
			detailLoading = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void grnId;
		void loadDetail();
		return () => abort?.abort();
	});

</script>

<div class="mb-4 flex items-center justify-between gap-2">
	<div class="flex items-center gap-2">
		<DaisyUiTooltip
			tooltipText={m.inv_common_back_to_list()}
			className="d-tooltip-ghost d-tooltip-right"
		>
			<DaisyUiButton
				type="button"
				className="d-btn-sm d-btn-ghost d-btn-square"
				onClick={() => void goto(resolve(grnListPath as any))}
			>
				<LucideArrowLeft className="size-5" />
			</DaisyUiButton>
		</DaisyUiTooltip>
		<h1 class="text-lg font-semibold">{m.inv_page_grn_title()}</h1>
	</div>
	{#if detailLoading}
		<span class="d-loading d-loading-spinner d-loading-sm" aria-label="Loading"></span>
	{/if}
</div>

<div class="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2">
	<div class="rounded-lg border border-base-300 bg-base-100 p-3">
		<div class="text-sm text-base-content/60">{m.inv_grn_col_store()}</div>
		<div class="font-medium">{detail?.storeName ?? '—'}</div>
	</div>
	<div class="rounded-lg border border-base-300 bg-base-100 p-3">
		<div class="text-sm text-base-content/60">{m.inv_po_select_supplier()}</div>
		<div class="font-medium">{detail?.supplierName ?? '—'}</div>
	</div>
	<div class="rounded-lg border border-base-300 bg-base-100 p-3">
		<div class="text-sm text-base-content/60">{m.inv_grn_received_date()}</div>
		<div class="font-medium">{detail?.receivedDate ?? '—'}</div>
	</div>
	<div class="rounded-lg border border-base-300 bg-base-100 p-3">
		<div class="text-sm text-base-content/60">{m.status()}</div>
		<div class="font-medium">{detail?.statusName ?? '—'}</div>
	</div>
	<div class="rounded-lg border border-base-300 bg-base-100 p-3">
		<div class="text-sm text-base-content/60">{m.inv_common_received_by()}</div>
		<div class="font-medium">{detail?.receivedByName ?? '—'}</div>
	</div>
</div>

<div class="mb-4 rounded-lg border border-base-300 bg-base-100 p-3">
	<div class="mb-2 flex items-center justify-between">
		<h2 class="font-semibold">Invoice</h2>
		{#if detail?.invoicePhotoUrl?.trim()}
			<span class="text-sm text-base-content/70">Invoice photo available</span>
		{/if}
	</div>
	<div class="grid grid-cols-1 gap-2 md:grid-cols-3">
		<div>
			<div class="text-sm text-base-content/60">Invoice No</div>
			<div class="font-medium">{detail?.invoiceNo?.trim() || '—'}</div>
		</div>
		<div>
			<div class="text-sm text-base-content/60">Invoice Date</div>
			<div class="font-medium">{detail?.invoiceDate?.trim() || '—'}</div>
		</div>
		<div>
			<div class="text-sm text-base-content/60">Invoice Amount</div>
			<div class="font-medium">
				{#if detail?.invoiceAmount?.trim()}
					{@const raw = detail.invoiceAmount.trim()}
					{@const n = Number(raw)}
					{Number.isFinite(n)
						? new Intl.NumberFormat(undefined, {
								minimumFractionDigits: 0,
								maximumFractionDigits: 4
							}).format(n)
						: raw}
				{:else}
					—
				{/if}
			</div>
		</div>
	</div>
</div>

<div class={TableEnum.HEIGHT}>
	<MariTable
		columns={lineColumns as MariTableColumn[]}
		rows={detail?.lines ?? []}
		isLoading={detailLoading}
		showRowActions={false}
		actionsVariant="none"
		showRefreshButton={false}
	/>
</div>

