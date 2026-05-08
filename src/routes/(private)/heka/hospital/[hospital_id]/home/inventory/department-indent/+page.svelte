<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideBan from '$lib/component/own/library/lucide/LucideBan.svelte';
	import LucideCircleX from '$lib/component/own/library/lucide/LucideCircleX.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import InventoryCancelReasonDialogContent from '$lib/component/own/local/private/heka/inventory/InventoryCancelReasonDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import {
		InvApprovalActionEnum,
		InvDepartmentIndentStatusTaggingEnum
	} from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
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
		fromStoreId: number;
		toStoreId: number;
		fromStoreName: string | null;
		toStoreName: string | null;
		statusTaggingId: number;
		remarks: string | null;
		createdAt: string;
		updatedAt?: string | null;
		createdByName?: string | null;
		updatedByName?: string | null;
		approvedAt?: string | null;
		approvedByName?: string | null;
		itemNames?: string | null;
		canCancel?: boolean;
		canApprove?: boolean;
	};

	let list = $state<Row[]>([]);
	let loading = $state(false);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(
		String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)
	);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastInitHospitalId = $state<string | null>(null);

	let actId = $state<string | null>(null);

	let cancelIndentId = $state<string | null>(null);

	const diNewPath = $derived(
		hekaHospitalPageUrl(
			hospitalId,
			'/heka/home/inventory/department-indent/new' as any
		)
	);

	function diDetailHref(id: string) {
		return `/heka/hospital/${hospitalId}/home/inventory/department-indent/${encodeURIComponent(id)}`;
	}

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

	const columns: MariTableColumn<Row>[] = $derived([
		{
			id: 'indentNo',
			header: m.inv_dept_indent_no(),
			field: 'indentNo',
			filterable: true,
			format: (_v, r) => r.indentNo ?? '—'
		},
		{
			id: 'from',
			header: m.inv_dept_indent_from(),
			field: 'fromStoreId',
			filterable: true,
			format: (_v, r) => r.fromStoreName ?? '—'
		},
		{
			id: 'to',
			header: m.inv_dept_indent_to(),
			field: 'toStoreId',
			filterable: true,
			format: (_v, r) => r.toStoreName ?? '—'
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
			header: m.inv_dept_indent_status(),
			field: 'statusTaggingId',
			filterType: 'select',
			filterOptionsGetter: () => [
				{
					value: String(InvDepartmentIndentStatusTaggingEnum.DRAFT),
					label: m.inv_dept_status_draft()
				},
				{
					value: String(InvDepartmentIndentStatusTaggingEnum.PENDING),
					label: m.inv_dept_status_pending()
				},
				{
					value: String(
						InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL
					),
					label: m.inv_dept_status_pending_fulfill()
				},
				{
					value: String(InvDepartmentIndentStatusTaggingEnum.ISSUED),
					label: m.inv_dept_status_issued()
				},
				{
					value: String(InvDepartmentIndentStatusTaggingEnum.RECEIVED),
					label: m.inv_dept_status_received()
				},
				{
					value: String(
						InvDepartmentIndentStatusTaggingEnum.CANCELLED
					),
					label: m.inv_dept_status_cancelled()
				}
			],
			format: (_v, r) => indentStatusLabel(r.statusTaggingId)
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
			const fromStoreIdFilter = tableFilters.fromStoreId?.trim() ?? '';
			if (fromStoreIdFilter !== '') {
				ps.set('fromStoreId', fromStoreIdFilter);
			}
			const toStoreIdFilter = tableFilters.toStoreId?.trim() ?? '';
			if (toStoreIdFilter !== '') {
				ps.set('toStoreId', toStoreIdFilter);
			}
			const sf = tableFilters.statusTaggingId?.trim() ?? '';
			if (sf !== '') {
				ps.set('statusTaggingId', sf);
			}
			const indentNo = tableFilters.indentNo?.trim();
			if (indentNo) ps.set('indentNo', indentNo);
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-indent?${ps}`,
				{ method: 'GET' }
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
		tableFilters = {};
	});

	$effect(() => {
		if (!hospitalId) return;
		void selectedInventoryFromStoreId;
		currentPage = 1;
		void loadList();
	});

	async function approve(row: Row, act: number) {
		if (!hospitalId) return;
		actId = row.id;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-indent/approve`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						indentId: row.id,
						action: act,
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
		cancelIndentId = row.id;
		await dialogService.open({
			title: m.inv_di_cancel(),
			modalClassName: 'max-w-md',
			component: InventoryCancelReasonDialogContent,
			props: {
				confirmLabel: m.inv_di_cancel_confirm(),
				textareaAriaLabel: m.inv_di_cancel_reason_prompt(),
				emptyReasonToastTitle: m.inv_di_cancel(),
				emptyReasonToastDetail: m.inv_di_cancel_reason_prompt(),
				runDestructive: submitCancelIndentWithReason
			},
			onClose: () => {
				cancelIndentId = null;
			}
		});
	}

	async function submitCancelIndentWithReason(reason: string) {
		if (!hospitalId || !cancelIndentId) return;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory/department-indent/cancel`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ indentId: cancelIndentId, reason })
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
		cancelIndentId = null;
		await loadList();
		toast.addToast(m.inv_common_success(), StatusColorEnum.SUCCESS);
	}
</script>

<div class="mb-4 flex items-center justify-between">
	<h1 class="text-lg font-semibold">
		{m.inv_page_department_indent_title()}
	</h1>
	<DaisyUiButton
		className="d-btn-primary"
		onClick={() => void goto(resolve(diNewPath as any))}
	>
		<LucidePlus className="size-4" />
		{m.inv_dept_indent_new()}
	</DaisyUiButton>
</div>

<div class={TableEnum.HEIGHT}>
	{#key hospitalId}
		<MariTable
			columns={columns as MariTableColumn[]}
			rows={list}
			bind:currentPage
			bind:pageSize={pageSizeStr}
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
				loadList();
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
				<DaisyUiTooltip
					tooltipText={m.inv_common_view()}
					className="d-tooltip-ghost d-tooltip-right"
				>
					<DaisyUiButton
						className="d-btn-sm d-btn-ghost d-btn-square"
						disabled={loading}
						onClick={() => void goto(diDetailHref(r.id))}
					>
						<LucideEye className="size-5" />
					</DaisyUiButton>
				</DaisyUiTooltip>
				{#if r.statusTaggingId === InvDepartmentIndentStatusTaggingEnum.PENDING}
					<DaisyUiTooltip
						tooltipText={m.inv_btn_approve()}
						className="d-tooltip-accent d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-sm d-btn-ghost d-btn-square text-accent"
							disabled={actId != null || r.canApprove !== true}
							onClick={() =>
								void approve(r, InvApprovalActionEnum.APPROVED)}
						>
							<LucideCircleCheck className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
					<DaisyUiTooltip
						tooltipText={m.inv_btn_reject()}
						className="d-tooltip-error d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-sm d-btn-ghost d-btn-square text-error"
							disabled={actId != null || r.canApprove !== true}
							onClick={() =>
								void approve(r, InvApprovalActionEnum.REJECTED)}
						>
							<LucideBan className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
				{/if}
				<DaisyUiTooltip
					tooltipText={m.inv_di_cancel()}
					className="d-tooltip-error d-tooltip-right"
				>
					<DaisyUiButton
						className="d-btn-sm d-btn-ghost d-btn-square text-error"
						disabled={r.canCancel !== true}
						onClick={() => openCancelDialog(r)}
					>
						<LucideCircleX className="size-5" />
					</DaisyUiButton>
				</DaisyUiTooltip>
			</div>
		{/snippet}
		</MariTable>
	{/key}
</div>

