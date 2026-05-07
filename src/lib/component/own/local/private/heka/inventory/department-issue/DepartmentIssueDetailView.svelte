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
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import type { DepartmentIssueDetailLine } from '$lib/model/type/heka/department-issue-detail.type';
	import { formatPurchaseQtyCellForDetailLine } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	const toast = new ToastService();

	let {
		hospitalId,
		issueId,
		backHref,
		backTooltip = m.inv_common_back_to_list(),
		detailHeading: detailHeadingProp
	}: {
		hospitalId: string;
		issueId: string;
		backHref: string;
		backTooltip?: string;
		detailHeading?: string;
	} = $props();

	const detailHeading = $derived(
		detailHeadingProp?.trim() ? detailHeadingProp : m.inv_di_issue_detail_heading()
	);

	type IssueDetail = {
		id: string;
		issueNo?: string | null;
		sourceIndentId?: string | null;
		sourceIndentNo?: string | null;
		fromStoreId: number;
		toStoreId: number;
		fromStoreName?: string | null;
		toStoreName?: string | null;
		statusName?: string | null;
		createdAt?: string | null;
		lines: DepartmentIssueDetailLine[];
	};

	let detail = $state<IssueDetail | null>(null);
	let loading = $state(false);

	const lineColumns: MariTableColumn<DepartmentIssueDetailLine>[] = [
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
			id: 'qtyIssued',
			header: m.inv_di_col_qty_issued(),
			field: 'qtyIssued',
			format: (_v, r) =>
				formatPurchaseQtyCellForDetailLine({ ...r, quantity: r.qtyIssued })
		}
	];

	async function loadDetail() {
		if (!hospitalId || !issueId) return;
		loading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-issue?id=${encodeURIComponent(issueId)}`,
				{ method: 'GET' }
			);
			if (!res.ok) throw new Error(String(res.status));
			detail = (await res.json()) as IssueDetail;
		} catch (e) {
			toast.addErrorToast(m.inv_di_issue_detail_heading(), e);
			detail = null;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void issueId;
		void loadDetail();
	});
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
	<div class="flex items-center gap-2">
		<DaisyUiTooltip tooltipText={backTooltip} className="d-tooltip-ghost d-tooltip-right">
			<DaisyUiButton
				type="button"
				className="d-btn-sm d-btn-ghost d-btn-square"
				onClick={() => void goto(backHref)}
			>
				<LucideArrowLeft className="size-5" />
			</DaisyUiButton>
		</DaisyUiTooltip>
		<h1 class="text-lg font-semibold">
			{detailHeading}
			{#if detail?.issueNo}
				<span class="opacity-80"> — {detail.issueNo}</span>
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
			<div>
				<DaisyUiLabel className="text-xs">{m.inv_nav_from_store()}</DaisyUiLabel>
				<input
					type="text"
					readonly
					disabled
					class="d-input d-input-bordered mt-1 w-full text-sm"
					value={detail.fromStoreName?.trim() ? detail.fromStoreName : '—'}
					aria-label={m.inv_nav_from_store()}
				/>
			</div>
			<div>
				<DaisyUiLabel className="text-xs">{m.inv_dept_indent_to()}</DaisyUiLabel>
				<input
					type="text"
					readonly
					disabled
					class="d-input d-input-bordered mt-1 w-full text-sm"
					value={detail.toStoreName?.trim() ? detail.toStoreName : '—'}
					aria-label={m.inv_dept_indent_to()}
				/>
			</div>
			<div class="sm:col-span-2">
				<DaisyUiLabel className="text-xs">{m.status()}</DaisyUiLabel>
				<input
					type="text"
					readonly
					disabled
					class="d-input d-input-bordered mt-1 w-full text-sm"
					value={detail.statusName ?? '—'}
					aria-label={m.status()}
				/>
			</div>
			{#if detail.sourceIndentNo?.trim()}
				<div class="sm:col-span-2">
					<DaisyUiLabel className="text-xs">{m.inv_di_from_indent()}</DaisyUiLabel>
					<input
						type="text"
						readonly
						disabled
						class="d-input d-input-bordered mt-1 w-full text-sm"
						value={detail.sourceIndentNo}
						aria-label={m.inv_di_from_indent()}
					/>
				</div>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>

	<DaisyUiCard>
		<DaisyUiCardBody>
			<div class={TableEnum.HEIGHT}>
				<MariTable
					columns={lineColumns as MariTableColumn[]}
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
