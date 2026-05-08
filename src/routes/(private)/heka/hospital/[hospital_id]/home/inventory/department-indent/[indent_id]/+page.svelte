<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucideBan from '$lib/component/own/library/lucide/LucideBan.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import InventoryCancelReasonDialogContent from '$lib/component/own/local/private/heka/inventory/InventoryCancelReasonDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import type {
		DepartmentIndentAllocationRow,
		DepartmentIndentDetail,
		DepartmentIndentDetailLine
	} from '$lib/model/type/heka/department-indent-detail.type';
	import {
		InvApprovalActionEnum,
		InvDepartmentIndentStatusTaggingEnum
	} from '$lib/model/enum/db-link';
	import { formatPurchaseQtyCellForDetailLine } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import { m } from '$lib/paraglide/messages';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	const indentId = $derived(
		typeof page.params.indent_id === 'string'
			? page.params.indent_id
			: ''
	);

	const diListPath = $derived(
		hekaHospitalPageUrl(
			hospitalId,
			'/heka/home/inventory/department-indent' as const
		)
	);

	const deptIssueNewFromIndentPath = $derived(
		resolve(
			hekaHospitalPageUrl(
				hospitalId,
				'/heka/home/inventory/department-issue/new' as const
			) as any
		)
	);

	let { data: layoutData } = $props();
	const selectedInventoryFromStoreId = $derived(
		(layoutData as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);

	let detail = $state<DepartmentIndentDetail | null>(null);
	let detailLoading = $state(true);
	let abort: AbortController | null = null;

	let actBusy = $state(false);


	function indentStatusLabel(id: number): string {
		switch (id) {
			case InvDepartmentIndentStatusTaggingEnum.DRAFT:
				return m.inv_dept_status_draft();
			case InvDepartmentIndentStatusTaggingEnum.PENDING:
				return m.inv_dept_status_pending();
			case InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL:
				return m.inv_dept_status_pending_fulfill();
			case InvDepartmentIndentStatusTaggingEnum.ISSUED:
				return m.inv_dept_status_issued();
			case InvDepartmentIndentStatusTaggingEnum.RECEIVED:
				return m.inv_dept_status_received();
			case InvDepartmentIndentStatusTaggingEnum.CANCELLED:
				return m.inv_dept_status_cancelled();
			default:
				return String(id);
		}
	}

	const lineColumns: MariTableColumn<DepartmentIndentDetailLine>[] = [
		{
			id: 'item',
			header: m.inv_common_item(),
			field: 'itemName',
			format: (_v, row) => row.itemName ?? '—'
		},
		{
			id: 'qty',
			header: m.inv_common_quantity(),
			field: 'quantity',
			format: (_v, row) => formatPurchaseQtyCellForDetailLine(row)
		},
		{
			id: 'unit',
			header: m.inv_common_unit(),
			field: 'unitName',
			format: (_v, row) => row.unitName ?? '—'
		},
		{
			id: 'qtyIssued',
			header: m.inv_di_col_qty_issued(),
			field: 'qtyIssued',
			format: (_v, row) =>
				formatPurchaseQtyCellForDetailLine({ ...row, quantity: row.qtyIssued })
		}
	];

	const allocColumns: MariTableColumn<DepartmentIndentAllocationRow>[] =
		[
			{
				id: 'item',
				header: m.inv_common_item(),
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
				id: 'expiry',
				header: m.inv_stock_col_expiry(),
				field: 'expiryDate',
				format: (_v, row) => row.expiryDate ?? '—'
			},
			{
				id: 'qty',
				header: m.inv_common_quantity(),
				field: 'quantity',
				format: (_v, row) => formatPurchaseQtyCellForDetailLine(row)
			}
		];

	async function loadDetail() {
		if (!hospitalId || !indentId) return;
		abort?.abort();
		abort = new AbortController();
		detailLoading = true;
		try {
			const sp = new URLSearchParams();
			sp.set('id', indentId);
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-indent?${sp.toString()}`,
				{ method: 'GET', signal: abort.signal }
			);
			if (!res.ok) {
				toastService.addToast(
					m.inv_di_indent_detail_heading(),
					StatusColorEnum.ERROR,
					`HTTP ${res.status}`
				);
				detail = null;
				return;
			}
			detail = (await res.json()) as DepartmentIndentDetail;
		} catch (e) {
			if ((e as { name?: string }).name === 'AbortError') return;
			toastService.addErrorToast(m.inv_di_indent_detail_heading(), e);
			detail = null;
		} finally {
			detailLoading = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void indentId;
		void loadDetail();
		return () => abort?.abort();
	});

	async function openCancelDialog() {
		await dialogService.open({
			title: m.inv_di_cancel(),
			modalClassName: 'max-w-md',
			component: InventoryCancelReasonDialogContent,
			props: {
				confirmLabel: m.inv_di_cancel_confirm(),
				textareaAriaLabel: m.inv_di_cancel_reason_prompt(),
				emptyReasonToastTitle: m.inv_di_cancel(),
				emptyReasonToastDetail: m.inv_di_cancel_reason_prompt(),
				runDestructive: submitCancelWithReason
			}
		});
	}

	async function submitCancelWithReason(reason: string) {
		if (!hospitalId || !indentId) return;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory/department-indent/cancel`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ indentId, reason })
			}
		);
		if (!res.ok) {
			toastService.addToast(
				m.inv_di_cancel(),
				StatusColorEnum.ERROR,
				await res.text()
			);
			throw new Error('cancel_failed');
		}
		await loadDetail();
		toastService.addToast(
			m.inv_common_success(),
			StatusColorEnum.SUCCESS
		);
	}

	async function postApprove(action: number) {
		if (!hospitalId || !indentId) return;
		actBusy = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-indent/approve`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						indentId,
						action,
						remarks: null
					})
				}
			);
			if (!res.ok) {
				toastService.addToast(
					m.inv_dept_indent_approve(),
					StatusColorEnum.ERROR,
					await res.text()
				);
				return;
			}
			await loadDetail();
			toastService.addToast(
				m.inv_common_success(),
				StatusColorEnum.SUCCESS
			);
		} finally {
			actBusy = false;
		}
	}

</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
	<div class="flex items-center gap-2">
		<DaisyUiTooltip
			tooltipText={m.inv_common_back_to_list()}
			className="d-tooltip-ghost d-tooltip-right"
		>
			<DaisyUiButton
				type="button"
				className="d-btn-sm d-btn-ghost d-btn-square"
				onClick={() => void goto(resolve(diListPath as any))}
			>
				<LucideArrowLeft className="size-5" />
			</DaisyUiButton>
		</DaisyUiTooltip>
		<h1 class="text-lg font-semibold">
			{m.inv_di_indent_detail_heading()}
			{#if detail?.indentNo}
				<span class="opacity-80"> — {detail.indentNo}</span>
			{/if}
		</h1>
	</div>
	{#if detailLoading}
		<span
			class="d-loading d-loading-sm d-loading-spinner"
			aria-label="Loading"
		></span>
	{/if}
</div>

{#if detail && !detailLoading}
	{#if
		detail.statusTaggingId ===
			InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL &&
		selectedInventoryFromStoreId != null &&
		detail.toStoreId === selectedInventoryFromStoreId
	}
		<div class="d-alert d-alert-info mb-4 text-sm" role="status">
			{m.inv_di_pending_central_fulfill_hint()}
			<DaisyUiButton
				type="button"
				className="d-btn-sm d-btn-primary ml-2"
				onClick={() => void goto(deptIssueNewFromIndentPath)}
			>
				{m.inv_dept_issue_new_from_indent()}
			</DaisyUiButton>
		</div>
	{/if}
	<div class="mb-4 flex flex-wrap gap-2">
		<!-- Buttons removed per requirement (approve/reject/cancel). -->
	</div>
{/if}

<div
	class="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3"
>
	<div class="rounded-lg border border-base-300 bg-base-100 p-3">
		<div class="text-sm text-base-content/60">{m.status()}</div>
		<div class="font-medium">
			{detail ? indentStatusLabel(detail.statusTaggingId) : '—'}
		</div>
	</div>
	<div class="rounded-lg border border-base-300 bg-base-100 p-3">
		<div class="text-sm text-base-content/60">
			{m.inv_dept_indent_from()}
		</div>
		<div class="font-medium">{detail?.fromStoreName ?? '—'}</div>
	</div>
	<div class="rounded-lg border border-base-300 bg-base-100 p-3">
		<div class="text-sm text-base-content/60">
			{m.inv_dept_indent_to()}
		</div>
		<div class="font-medium">{detail?.toStoreName ?? '—'}</div>
	</div>
	<div
		class="rounded-lg border border-base-300 bg-base-100 p-3 md:col-span-2"
	>
		<div class="text-sm text-base-content/60">
			{m.inv_common_remarks()}
		</div>
		<div class="font-medium whitespace-pre-wrap">
			{detail?.remarks?.trim() || '—'}
		</div>
	</div>
	<div class="rounded-lg border border-base-300 bg-base-100 p-3">
		<div class="text-sm text-base-content/60">{m.support_requester()}</div>
		<div class="font-medium">{detail?.requestedByName ?? '—'}</div>
	</div>
	{#if detail?.fromApprovedAt}
		<div class="rounded-lg border border-base-300 bg-base-100 p-3">
			<div class="text-sm text-base-content/60">
				{m.inv_common_approved_by()}
			</div>
			<div class="font-medium">
				{detail.fromApprovedByName ?? '—'}
			</div>
			<div class="text-xs opacity-70">{detail.fromApprovedAt}</div>
		</div>
	{/if}
	{#if detail?.issuedAt}
		<div class="rounded-lg border border-base-300 bg-base-100 p-3">
			<div class="text-sm text-base-content/60">
				{m.inv_di_meta_issued_by()}
			</div>
			<div class="font-medium">{detail.issuedByName ?? '—'}</div>
			<div class="text-xs opacity-70">{detail.issuedAt}</div>
		</div>
	{/if}
	{#if detail?.receivedAt}
		<div class="rounded-lg border border-base-300 bg-base-100 p-3">
			<div class="text-sm text-base-content/60">
				{m.inv_di_meta_received_by()}
			</div>
			<div class="font-medium">{detail.receivedByName ?? '—'}</div>
			<div class="text-xs opacity-70">{detail.receivedAt}</div>
		</div>
	{/if}
	{#if detail?.cancelledAt}
		<div
			class="rounded-lg border border-base-300 bg-base-100 p-3 md:col-span-2"
		>
			<div class="text-sm text-base-content/60">
				{m.inv_common_cancelled_by()}
			</div>
			<div class="font-medium">{detail.cancelledByName ?? '—'}</div>
			<div class="text-xs opacity-70">{detail.cancelledAt}</div>
			{#if detail.cancelReason?.trim()}
				<div class="mt-1 text-sm">{detail.cancelReason}</div>
			{/if}
		</div>
	{/if}
</div>

<h2 class="mb-2 font-semibold">{m.inv_di_detail_lines()}</h2>
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

{#if detail && detail.allocations.length > 0}
	<h2 class="mt-6 mb-2 font-semibold">
		{m.inv_di_detail_allocations()}
	</h2>
	<div class={TableEnum.HEIGHT}>
		<MariTable
			columns={allocColumns as MariTableColumn[]}
			rows={detail.allocations}
			isLoading={false}
			showRowActions={false}
			actionsVariant="none"
			showRefreshButton={false}
		/>
	</div>
{/if}

