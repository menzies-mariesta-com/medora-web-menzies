<script lang="ts">
	import { goto } from '$app/navigation';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import {
		InvDepartmentConsumptionStatusTaggingEnum
	} from '$lib/model/enum/db-link';
	import type { DepartmentConsumptionDetailLine } from '$lib/model/type/heka/department-consumption-detail.type';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { formatPurchaseQtyCellForDetailLine } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	const toast = new ToastService();

	let {
		hospitalId,
		consumptionId,
		backHref
	}: {
		hospitalId: string;
		consumptionId: string;
		backHref: string;
	} = $props();

	type DetailRow = {
		id: string;
		consumptionNo?: string | null;
		storeId: number;
		storeName?: string | null;
		statusTaggingId?: number;
		statusName?: string | null;
		remarks?: string | null;
		canApprove?: boolean;
		canCancel?: boolean;
		lines: DepartmentConsumptionDetailLine[];
		logs?: {
			level: number;
			action: number;
			remarks: string | null;
			createdAt: string;
			approvedByName?: string | null;
		}[];
	};

	let detail = $state<DetailRow | null>(null);
	let loading = $state(false);

	const isPending = $derived(
		detail?.statusTaggingId === InvDepartmentConsumptionStatusTaggingEnum.PENDING
	);

	async function loadDetail() {
		if (!hospitalId || !consumptionId) return;
		loading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-consumption?id=${encodeURIComponent(consumptionId)}`,
				{ method: 'GET' }
			);
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as DetailRow | null;
			detail = j;
		} catch (e) {
			toast.addErrorToast(m.inv_dc_detail_heading(), e);
			detail = null;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void consumptionId;
		void loadDetail();
	});

	const readColumns: MariTableColumn<DepartmentConsumptionDetailLine>[] = [
		{
			id: 'item',
			header: m.inv_common_item(),
			field: 'itemName',
			format: (_v, r) => r.itemName ?? '—'
		},
		{
			id: 'qty',
			header: m.inv_common_quantity(),
			field: 'quantity',
			format: (_v, r) => formatPurchaseQtyCellForDetailLine(r)
		},
		{
			id: 'unit',
			header: m.inv_common_unit(),
			field: 'unitName',
			format: (_v, r) => r.unitName ?? '—'
		},
		{
			id: 'batch',
			header: m.inv_dc_batch(),
			field: 'batchNo',
			format: (_v, r) => r.batchNo ?? '—'
		},
		{
			id: 'exp',
			header: m.inv_stock_col_expiry(),
			field: 'expiryDate',
			format: (_v, r) => r.expiryDate ?? '—'
		}
	];
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
	<div class="flex items-center gap-2">
		<DaisyUiTooltip tooltipText={m.inv_common_back_to_list()} className="d-tooltip-ghost d-tooltip-right">
			<DaisyUiButton
				type="button"
				className="d-btn-sm d-btn-ghost d-btn-square"
				onClick={() => void goto(backHref)}
			>
				<LucideArrowLeft className="size-5" />
			</DaisyUiButton>
		</DaisyUiTooltip>
		<h1 class="text-lg font-semibold">
			{m.inv_dc_detail_heading()}
			{#if detail?.consumptionNo}
				<span class="opacity-80"> — {detail.consumptionNo}</span>
			{/if}
		</h1>
	</div>
	{#if loading}
		<span class="d-loading d-loading-sm d-loading-spinner" aria-label={m.loading()}></span>
	{/if}
</div>

{#if detail && !loading}
	<DaisyUiCard className="mb-4">
		<DaisyUiCardBody className="grid gap-3 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<DaisyUiLabel className="text-xs">{m.status()}</DaisyUiLabel>
				<input
					type="text"
					readonly
					disabled
					class="d-input d-input-bordered mt-1 w-full text-sm"
					value={detail.statusName ?? '—'}
				/>
			</div>
			<div class="sm:col-span-2">
				<DaisyUiLabel className="text-xs">{m.inv_dc_store()}</DaisyUiLabel>
				<input
					type="text"
					readonly
					disabled
					class="d-input d-input-bordered mt-1 w-full text-sm"
					value={detail.storeName ?? '—'}
				/>
			</div>
			{#if detail.remarks?.trim()}
				<div class="sm:col-span-2">
					<DaisyUiLabel className="text-xs">{m.inv_dept_indent_remarks()}</DaisyUiLabel>
					<textarea
						class="d-textarea d-textarea-bordered mt-1 w-full text-sm"
						rows="2"
						readonly
						disabled
						value={detail.remarks}
					></textarea>
				</div>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>

	<DaisyUiCard className="mb-4">
		<DaisyUiCardBody>
			<div class="mb-2 flex items-center justify-between gap-2">
				<span class="font-medium">{m.inv_dc_lines_title()}</span>
			</div>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					columns={readColumns as MariTableColumn[]}
					rows={detail.lines ?? []}
					showRefreshButton={false}
					enableColumnFilters={false}
					showRowActions={false}
					actionsVariant="none"
				/>
			</div>
		</DaisyUiCardBody>
	</DaisyUiCard>

{:else if !loading}
	<p class="text-sm opacity-70">{m.inv_detail_not_found()}</p>
{/if}
