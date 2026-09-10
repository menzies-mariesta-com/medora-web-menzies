<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideCircleX from '$lib/component/own/library/lucide/LucideCircleX.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import InventoryCancelReasonDialogContent from '$lib/component/own/local/private/medora/inventory/InventoryCancelReasonDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { InvDepartmentIssueStatusTaggingEnum } from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	const dt = new DateTimeUtil();
	const toast = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	let { data } = $props();
	const fromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);

	type Row = {
		id: string;
		indentNo: string | null;
		issueNo: string | null;
		fromStoreId: number;
		fromStoreName: string | null;
		toStoreName: string | null;
		itemNames?: string | null;
		createdAt: string;
		updatedAt?: string | null;
		createdByName?: string | null;
		updatedByName?: string | null;
		approvedAt?: string | null;
		approvedByName?: string | null;
		cancelledAt?: string | null;
		cancelledByName?: string | null;
		statusTaggingId?: number;
		statusName?: string | null;
		canReceive?: boolean;
		canCancel?: boolean;
	};

	let list = $state<Row[]>([]);
	let loading = $state(false);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(
		String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)
	);
	let tableFilters = $state<Record<string, string>>({
		statusTaggingId: String(
			InvDepartmentIssueStatusTaggingEnum.ISSUED
		)
	});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let lastInitHospitalId = $state<string | null>(null);
	let actId = $state<string | null>(null);
	let cancelIssueId = $state<string | null>(null);

	const RECEIPT_STATUS_FILTER_OPTIONS = $derived([
		{
			label: m.inv_dept_issue_status_pending(),
			value: String(InvDepartmentIssueStatusTaggingEnum.PENDING)
		},
		{
			label: m.inv_dept_issue_status_issued(),
			value: String(InvDepartmentIssueStatusTaggingEnum.ISSUED)
		},
		{
			label: m.inv_dept_issue_status_received(),
			value: String(InvDepartmentIssueStatusTaggingEnum.RECEIVED)
		},
		{
			label: m.inv_dept_issue_status_cancelled(),
			value: String(InvDepartmentIssueStatusTaggingEnum.CANCELLED)
		}
	]);

	function receiptIssueDetailHref(id: string) {
		return `/medora/hospital/${hospitalId}/home/inventory/receipt-from-store/${encodeURIComponent(id)}`;
	}

	const columns: MenziesTableColumn<Row>[] = $derived([
		{
			id: 'issueNo',
			header: m.inv_dept_issue_linked_issue_no(),
			field: 'issueNo',
			filterable: true,
			format: (_v, r) => r.issueNo ?? '—'
		},
		{
			id: 'toStoreId',
			header: m.inv_dept_indent_to(),
			field: 'toStoreId',
			filterable: fromStoreId == null,
			filterType: 'select',
			filterMasterKey: 'store',
			filterEmptyLabel: m.inv_report_filter_store_all(),
			format: (_v, r) => r.toStoreName ?? '—'
		},
		{
			id: 'fromStoreId',
			header: m.inv_dept_indent_from(),
			field: 'fromStoreId',
			filterable: true,
			filterType: 'select',
			filterMasterKey: 'store',
			filterEmptyLabel: m.inv_report_filter_store_all(),
			format: (_v, r) => r.fromStoreName ?? '—'
		},
		{
			id: 'itemNames',
			header: m.inv_common_item(),
			field: 'itemNames',
			cellClass: 'whitespace-pre-line',
			filterable: false,
			format: (_v, r) =>
				(r.itemNames ?? '')
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
					.join('\n') || '—'
		},
		{
			id: 'statusTaggingId',
			header: m.status(),
			field: 'statusTaggingId',
			filterType: 'select',
			filterOptions: RECEIPT_STATUS_FILTER_OPTIONS,
			defaultFilterValue: String(
				InvDepartmentIssueStatusTaggingEnum.ISSUED
			),
			format: (_v, r) => r.statusName ?? '—'
		}
	]);

	async function loadList() {
		if (!hospitalId) return;
		loading = true;
		try {
			const ps = new URLSearchParams();
			ps.set('page', String(currentPage));
			ps.set('pageSize', pageSizeStr);
			const statusId = tableFilters.statusTaggingId?.trim() ?? '';
			if (statusId !== '') {
				ps.set('statusTaggingId', statusId);
			}
			const issueNo = tableFilters.issueNo?.trim();
			if (issueNo) ps.set('issueNo', issueNo);
			const toStoreFilter = tableFilters.toStoreId?.trim() ?? '';
			if (fromStoreId != null) {
				// Receipt-from-store list is scoped to the selected (receiving) store.
				ps.set('toStoreId', String(fromStoreId));
			} else if (toStoreFilter !== '') {
				ps.set('toStoreId', toStoreFilter);
			}
			const fromStoreFilter = tableFilters.fromStoreId?.trim() ?? '';
			if (fromStoreFilter !== '') {
				ps.set('fromStoreId', fromStoreFilter);
			}
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/department-issue?${ps}`
			);
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as { data: Row[]; total?: number };
			list = j.data ?? [];
			total = j.total ?? 0;
		} catch (e) {
			toast.addErrorToast('List', e);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		const h = hospitalId;
		if (!h) {
			list = [];
			total = 0;
			return;
		}
		if (lastInitHospitalId === h) return;
		lastInitHospitalId = h;
		currentPage = 1;
		tableFilters = {
			statusTaggingId: String(
				InvDepartmentIssueStatusTaggingEnum.ISSUED
			)
		};
	});

	$effect(() => {
		if (!hospitalId) return;
		void fromStoreId;
		currentPage = 1;
		void loadList();
	});

	async function receiveRow(row: Row) {
		if (!hospitalId) return;
		actId = row.id;
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/department-issue/receive`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ issueId: row.id })
				}
			);
			if (!res.ok) {
				toast.addToast(
					m.inv_dept_indent_receive(),
					StatusColorEnum.ERROR,
					await res.text()
				);
				return;
			}
			toast.addToast(m.inv_common_success(), StatusColorEnum.SUCCESS);
			await loadList();
		} finally {
			actId = null;
		}
	}

	async function openCancelDialog(row: Row) {
		cancelIssueId = row.id;
		await dialogService.open({
			title: m.inv_di_cancel(),
			modalClassName: 'max-w-md',
			component: InventoryCancelReasonDialogContent,
			props: {
				confirmLabel: m.inv_di_cancel_confirm(),
				textareaAriaLabel: m.inv_di_cancel_reason_prompt(),
				emptyReasonToastTitle: m.inv_di_cancel(),
				emptyReasonToastDetail: m.inv_di_cancel_reason_prompt(),
				runDestructive: submitCancelReceiptIssueWithReason
			},
			onClose: () => {
				cancelIssueId = null;
			}
		});
	}

	async function submitCancelReceiptIssueWithReason(reason: string) {
		if (!hospitalId || !cancelIssueId) return;
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory/department-issue/cancel`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ issueId: cancelIssueId, reason })
			}
		);
		if (!res.ok) {
			toast.addToast(
				m.inv_di_cancel(),
				StatusColorEnum.ERROR,
				await res.text()
			);
			throw new Error('cancel_failed');
		}
		cancelIssueId = null;
		await loadList();
		toast.addToast(m.inv_common_success(), StatusColorEnum.SUCCESS);
	}
</script>

<div class="mb-4 flex flex-col gap-1">
	<h1 class="text-lg font-semibold">
		{m.inv_page_receipt_from_store_title()}
	</h1>
	{#if fromStoreId == null}
		<div class="mt-2 alert text-sm alert-warning" role="status">
			{m.inv_receipt_from_store_select_store_hint()}
		</div>
	{/if}
</div>

<div class={TableEnum.HEIGHT}>
	{#key hospitalId}
		<MenziesTable
			columns={columns as MenziesTableColumn[]}
			rows={list}
			masterFilterHospitalId={hospitalId}
			bind:currentPage
			bind:pageSize={pageSizeStr}
			bind:columnFilters={tableFilters}
			totalRowCount={total}
			isLoading={loading}
			showRowActions={true}
			actionsVariant="none"
			showRefreshButton={false}
			enableColumnFilters={true}
			useRemoteFilters={true}
			on:pageChange={() => loadList()}
			on:pageSizeChange={() => {
				currentPage = 1;
				void loadList();
			}}
			on:filtersChange={(event) => {
				if (filterDebounceTimeout) {
					clearTimeout(filterDebounceTimeout);
				}
				tableFilters = event.detail.filters;
				currentPage = 1;
				filterDebounceTimeout = setTimeout(() => {
					void loadList();
				}, 350);
			}}
				)}
		>
			{#snippet rowActions(row, _i)}
				{@const r = row as Row}
				<div class="flex flex-row items-center justify-center gap-1">
					<WashTooltip
						tooltipText={m.inv_common_view()}
						className="tooltip-ghost"
					>
						<WashButton
							className="btn-xs btn-ghost btn-square"
							disabled={loading}
							onClick={() => void goto(receiptIssueDetailHref(r.id))}
						>
							<LucideEye className="size-3.5" />
						</WashButton>
					</WashTooltip>
					<WashTooltip
						tooltipText={m.inv_dept_indent_receive()}
						className="tooltip-accent"
					>
						<WashButton
							type="button"
							className="btn-xs btn-ghost btn-square text-accent"
							disabled={actId != null ||
								fromStoreId == null ||
								r.canReceive !== true}
							loading={actId === r.id}
							onClick={() => void receiveRow(r)}
						>
							<LucideCircleCheck className="size-4" />
						</WashButton>
					</WashTooltip>
					<WashTooltip
						tooltipText={m.inv_di_cancel()}
						className="tooltip-error"
					>
						<WashButton
							className="btn-xs btn-ghost btn-square text-error"
							disabled={r.canCancel !== true}
							onClick={() => openCancelDialog(r)}
						>
							<LucideCircleX className="size-4" />
						</WashButton>
					</WashTooltip>
				</div>
			{/snippet}
		</MenziesTable>
	{/key}
</div>
