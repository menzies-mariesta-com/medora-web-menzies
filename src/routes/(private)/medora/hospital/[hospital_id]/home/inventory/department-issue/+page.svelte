<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideBan from '$lib/component/own/library/lucide/LucideBan.svelte';
	import LucideCircleX from '$lib/component/own/library/lucide/LucideCircleX.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import InventoryCancelReasonDialogContent from '$lib/component/own/local/private/medora/inventory/InventoryCancelReasonDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import {
		InvDepartmentIssueStatusTaggingEnum,
		InvApprovalActionEnum
	} from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { StringUtil } from '$lib/util/string.util.svelte';

	const toast = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	let { data } = $props();
	const selectedInventoryFromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);

	type Row = {
		id: string;
		indentNo: string | null;
		issueNo: string | null;
		sourceIndentNo?: string | null;
		sourceIndentFromStoreName?: string | null;
		sourceIndentToStoreName?: string | null;
		fromStoreId?: number;
		fromStoreName: string | null;
		toStoreName: string | null;
		itemNames?: string | null;
		toStoreId?: number;
		statusTaggingId?: number;
		statusName?: string | null;
		currentLevel?: number;
		canApprove?: boolean;
		canCancel?: boolean;
		createdAt?: string | null;
		updatedAt?: string | null;
		createdByName?: string | null;
		updatedByName?: string | null;
		approvedAt?: string | null;
		approvedByName?: string | null;
		cancelledAt?: string | null;
		cancelledByName?: string | null;
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
			InvDepartmentIssueStatusTaggingEnum.PENDING
		)
	});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let lastInitHospitalId = $state<string | null>(null);
	let actId = $state<string | null>(null);

	let cancelIssueId = $state<string | null>(null);

	const ISSUE_STATUS_FILTER_OPTIONS = $derived([
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

	const issueNewPath = $derived(
		medoraHospitalPageUrl(
			hospitalId,
			'/medora/home/inventory/department-issue/new' as const
		)
	);

	function issueDetailHref(issueId: string) {
		return `/medora/hospital/${hospitalId}/home/inventory/department-issue/${encodeURIComponent(issueId)}`;
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
			id: 'sourceIndent',
			header: m.inv_dept_issue_source_indent_col(),
			field: 'sourceIndentNo',
			filterable: false,
			cellClass: 'whitespace-pre-wrap',
			format: (_v, r) => {
				const no = r.sourceIndentNo?.trim();
				if (!no) return '—';
				const a = r.sourceIndentFromStoreName?.trim() || '—';
				const b = r.sourceIndentToStoreName?.trim() || '—';
				return `${no}: ${a} → ${b}`;
			}
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
			id: 'from',
			header: m.inv_dept_indent_from(),
			field: 'fromStoreId',
			filterable: false,
			format: (_v, r) => r.fromStoreName ?? '—'
		},
		{
			id: 'toStoreId',
			header: m.inv_dept_indent_to(),
			field: 'toStoreId',
			filterable: true,
			filterType: 'select',
			filterMasterKey: 'store',
			filterEmptyLabel: m.inv_report_filter_store_all(),
			format: (_v, r) => r.toStoreName ?? '—'
		},
		{
			id: 'statusTaggingId',
			header: m.status(),
			field: 'statusTaggingId',
			filterType: 'select',
			filterOptions: ISSUE_STATUS_FILTER_OPTIONS,
			defaultFilterValue: String(
				InvDepartmentIssueStatusTaggingEnum.PENDING
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
			if (selectedInventoryFromStoreId != null) {
				ps.set('fromStoreId', String(selectedInventoryFromStoreId));
			}
			const toStoreIdFilter = tableFilters.toStoreId?.trim() ?? '';
			if (toStoreIdFilter !== '') {
				ps.set('toStoreId', toStoreIdFilter);
			}
			const statusId = tableFilters.statusTaggingId?.trim() ?? '';
			if (statusId !== '') {
				ps.set('statusTaggingId', statusId);
			}
			const issueNo = tableFilters.issueNo?.trim();
			if (issueNo) ps.set('issueNo', issueNo);

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
				InvDepartmentIssueStatusTaggingEnum.PENDING
			)
		};
	});

	$effect(() => {
		if (!hospitalId) return;
		void selectedInventoryFromStoreId;
		currentPage = 1;
		void loadList();
	});

	async function approveRow(row: Row, action: number) {
		if (!hospitalId) return;
		actId = row.id;
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/department-issue/approve`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						issueId: row.id,
						action,
						remarks: null
					})
				}
			);
			if (!res.ok) {
				toast.addToast(
					'Approve',
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
				runDestructive: submitCancelIssueWithReason
			},
			onClose: () => {
				cancelIssueId = null;
			}
		});
	}

	async function submitCancelIssueWithReason(reason: string) {
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

<div class="mb-4 flex flex-col gap-2">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-lg font-semibold">
			{m.inv_page_department_issue_title()}
		</h1>
		<div class="flex flex-wrap gap-2">
			<WashButton
				className="btn-primary"
				onClick={() => void goto(resolve(issueNewPath as any))}
			>
				<LucidePlus className="size-4" />
				{m.inv_dept_issue_new_from_indent()}
			</WashButton>
			<WashButton
				className="btn-outline"
				onClick={() =>
					void goto(resolve(issueNewPath as any) + '?mode=manual')}
			>
				<LucidePlus className="size-4" />
				{m.inv_dept_issue_new_manual()}
			</WashButton>
		</div>
	</div>
	{#if selectedInventoryFromStoreId == null}
		<div class="alert text-sm alert-warning" role="status">
			{m.inv_dept_issue_select_store_hint()}
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
			rowTooltipGetter={(row) =>
				StringUtil.inventoryAuditRowTooltip(
					row as {
						createdAt?: string | null;
						updatedAt?: string | null;
						createdByName?: string | null;
						updatedByName?: string | null;
						approvedAt?: string | null;
						approvedByName?: string | null;
						cancelledAt?: string | null;
						cancelledByName?: string | null;
					}
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
							className="btn-sm btn-ghost btn-square"
							disabled={loading}
							onClick={() => void goto(issueDetailHref(r.id))}
						>
							<LucideEye className="size-5" />
						</WashButton>
					</WashTooltip>
					{#if r.canApprove != null}
						<WashTooltip
							tooltipText={m.inv_btn_approve()}
							className="tooltip-accent"
						>
							<WashButton
								className="btn-sm btn-ghost btn-square text-accent"
								disabled={actId != null ||
									r.canApprove !== true ||
									selectedInventoryFromStoreId == null ||
									r.fromStoreId !== selectedInventoryFromStoreId}
								loading={actId === r.id}
								onClick={() =>
									void approveRow(r, InvApprovalActionEnum.APPROVED)}
							>
								<LucideCircleCheck className="size-5" />
							</WashButton>
						</WashTooltip>
						<WashTooltip
							tooltipText={m.inv_btn_reject()}
							className="tooltip-error"
						>
							<WashButton
								className="btn-sm btn-ghost btn-square text-error"
								disabled={actId != null ||
									r.canApprove !== true ||
									selectedInventoryFromStoreId == null ||
									r.fromStoreId !== selectedInventoryFromStoreId}
								loading={actId === r.id}
								onClick={() =>
									void approveRow(r, InvApprovalActionEnum.REJECTED)}
							>
								<LucideBan className="size-5" />
							</WashButton>
						</WashTooltip>
					{/if}
					<WashTooltip
						tooltipText={m.inv_di_cancel()}
						className="tooltip-error"
					>
						<WashButton
							className="btn-sm btn-ghost btn-square text-error"
							disabled={r.canCancel !== true}
							onClick={() => openCancelDialog(r)}
						>
							<LucideCircleX className="size-5" />
						</WashButton>
					</WashTooltip>
				</div>
			{/snippet}
		</MenziesTable>
	{/key}
</div>
