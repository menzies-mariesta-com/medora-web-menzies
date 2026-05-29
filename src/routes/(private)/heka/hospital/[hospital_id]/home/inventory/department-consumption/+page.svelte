<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideBan from '$lib/component/own/library/lucide/LucideBan.svelte';
	import LucideCircleX from '$lib/component/own/library/lucide/LucideCircleX.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import {
		InvApprovalActionEnum,
		InvDepartmentConsumptionStatusTaggingEnum
	} from '$lib/model/enum/db-link';
	import { m } from '$lib/paraglide/messages';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import InventoryCancelReasonDialogContent from '$lib/component/own/local/private/heka/inventory/InventoryCancelReasonDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';

	const dt = new DateTimeUtil();
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
		consumptionNo: string | null;
		storeId: number;
		storeName: string | null;
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
		canApprove?: boolean;
		canCancel?: boolean;
	};

	let list = $state<Row[]>([]);
	let loading = $state(false);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(
		String(AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE)
	);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let lastInitHospitalId = $state<string | null>(null);
	let actId = $state<string | null>(null);
	let cancelConsumptionId = $state<string | null>(null);

	const STATUS_FILTER_OPTIONS = $derived([
		{ label: m.inv_di_status_filter_all(), value: '' },
		{
			label: m.inv_dc_status_pending(),
			value: String(InvDepartmentConsumptionStatusTaggingEnum.PENDING)
		},
		{
			label: m.inv_dc_status_posted(),
			value: String(InvDepartmentConsumptionStatusTaggingEnum.POSTED)
		},
		{
			label: m.inv_dc_status_cancelled(),
			value: String(
				InvDepartmentConsumptionStatusTaggingEnum.CANCELLED
			)
		}
	]);

	const newPath = $derived(
		hekaHospitalPageUrl(
			hospitalId,
			'/heka/home/inventory/department-consumption/new' as const
		)
	);

	function detailHref(id: string) {
		return `/heka/hospital/${hospitalId}/home/inventory/department-consumption/${encodeURIComponent(id)}`;
	}

	const columns: MariTableColumn<Row>[] = $derived([
		{
			id: 'consumptionNo',
			header: m.inv_dc_consumption_no(),
			field: 'consumptionNo',
			filterable: true,
			format: (_v, r) => r.consumptionNo ?? '—'
		},
		{
			id: 'store',
			header: m.inv_dc_store(),
			field: 'storeId',
			filterable: false,
			format: (_v, r) => r.storeName ?? '—'
		},
		{
			id: 'itemNames',
			header: m.inv_common_item(),
			field: 'itemNames',
			filterable: false,
			cellClass: 'whitespace-pre-line',
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
			filterOptions: STATUS_FILTER_OPTIONS,
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
				ps.set('storeId', String(selectedInventoryFromStoreId));
			}
			const statusId = tableFilters.statusTaggingId?.trim() ?? '';
			if (statusId !== '') ps.set('statusTaggingId', statusId);
			const cno = tableFilters.consumptionNo?.trim();
			if (cno) ps.set('consumptionNo', cno);

			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-consumption?${ps}`
			);
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as { data: Row[]; total?: number };
			list = j.data ?? [];
			total = j.total ?? 0;
		} catch (e) {
			toast.addErrorToast(
				m.inv_page_department_consumption_title(),
				e
			);
		} finally {
			loading = false;
		}
	}

	async function approveRow(row: Row, action: number) {
		if (!hospitalId) return;
		actId = row.id;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-consumption/approve`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						consumptionId: row.id,
						action,
						remarks: null
					})
				}
			);
			if (!res.ok) {
				toast.addToast(
					m.inv_dc_approve_title(),
					StatusColorEnum.ERROR,
					await res.text()
				);
				return;
			}
			await loadList();
			toast.addToast(m.inv_common_success(), StatusColorEnum.SUCCESS);
		} catch (e) {
			toast.addErrorToast(m.inv_dc_approve_title(), e);
		} finally {
			actId = null;
		}
	}

	async function openCancelDialog(row: Row) {
		if (!hospitalId) return;
		cancelConsumptionId = row.id;
		await dialogService.open({
			title: m.inv_dc_cancel_doc(),
			modalClassName: 'max-w-md',
			component: InventoryCancelReasonDialogContent,
			props: {
				confirmLabel: m.inv_di_cancel_confirm(),
				textareaAriaLabel: m.inv_dc_cancel_reason_prompt(),
				emptyReasonToastTitle: m.inv_dc_cancel_doc(),
				emptyReasonToastDetail: m.inv_dc_cancel_reason_prompt(),
				runDestructive: submitCancelWithReason
			}
		});
	}

	async function submitCancelWithReason(reason: string) {
		if (!hospitalId || !cancelConsumptionId) return;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory/department-consumption/cancel`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					consumptionId: cancelConsumptionId,
					reason
				})
			}
		);
		if (!res.ok) {
			toast.addToast(
				m.inv_dc_cancel_doc(),
				StatusColorEnum.ERROR,
				await res.text()
			);
			throw new Error('cancel_failed');
		}
		await loadList();
		toast.addToast(m.inv_common_success(), StatusColorEnum.SUCCESS);
	}

	$effect(() => {
		const h = hospitalId;
		void selectedInventoryFromStoreId;
		if (!h) {
			list = [];
			total = 0;
			lastInitHospitalId = null;
			return;
		}
		if (lastInitHospitalId !== h) {
			lastInitHospitalId = h;
			currentPage = 1;
		}
		void loadList();
	});
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
	<div>
		<h1 class="text-xl font-semibold">
			{m.inv_page_department_consumption_title()}
		</h1>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		<DaisyUiButton
			type="button"
			className="d-btn d-btn-primary d-btn-sm"
			onClick={() => void goto(newPath)}
		>
			<LucidePlus className="mr-1 size-4" />
			{m.inv_dc_new_title()}
		</DaisyUiButton>
	</div>
</div>

<div class={TableEnum.HEIGHT}>
	{#key hospitalId}
		<MariTable
			columns={columns as MariTableColumn[]}
			rows={list}
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
				if (filterDebounceTimeout)
					clearTimeout(filterDebounceTimeout);
				tableFilters = event.detail.filters;
				currentPage = 1;
				filterDebounceTimeout = setTimeout(
					() => void loadList(),
					350
				);
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
							disabled={loading || actId != null}
							onClick={() => void goto(detailHref(r.id))}
						>
							<LucideEye className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>

					{#if r.canApprove === true}
						<DaisyUiTooltip
							tooltipText={m.inv_dc_approve()}
							className="d-tooltip-accent d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-sm d-btn-ghost d-btn-square text-accent"
								disabled={actId != null}
								loading={actId === r.id}
								onClick={() =>
									void approveRow(r, InvApprovalActionEnum.APPROVED)}
							>
								<LucideCircleCheck className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
						<DaisyUiTooltip
							tooltipText={m.inv_dc_reject()}
							className="d-tooltip-error d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-sm d-btn-ghost d-btn-square text-error"
								disabled={actId != null}
								loading={actId === r.id}
								onClick={() =>
									void approveRow(r, InvApprovalActionEnum.REJECTED)}
							>
								<LucideBan className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					{/if}

					<DaisyUiTooltip
						tooltipText={m.inv_dc_cancel_doc()}
						className="d-tooltip-error d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-sm d-btn-ghost d-btn-square text-error"
							disabled={actId != null || r.canCancel !== true}
							onClick={() => void openCancelDialog(r)}
						>
							<LucideCircleX className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
				</div>
			{/snippet}
		</MariTable>
	{/key}
</div>
