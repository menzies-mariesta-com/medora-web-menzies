<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideCircleX from '$lib/component/own/library/lucide/LucideCircleX.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import InventoryCancelReasonDialogContent from '$lib/component/own/local/private/heka/inventory/InventoryCancelReasonDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';
	import { m } from '$lib/paraglide/messages';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { InvPrStatusTaggingEnum } from '$lib/model/enum/db-link';
	import { toastError } from '$lib/util/toast-copy.util';

	const dt = new DateTimeUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	let { data: layoutData } = $props();
	const selectedInventoryFromStoreId = $derived(
		(layoutData as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);
	const currentUserId = $derived(
		(layoutData as { currentUserId?: string | null }).currentUserId ?? null
	);

	const toastService = new ToastService();

	type PrRow = {
		id: string;
		prNo?: string | null;
		fromStoreId: number;
		toStoreId: number;
		createdBy?: string | null;
		statusTaggingId: number;
		currentLevel: number;
		statusName: string | null;
		statusCode: string | null;
		fromStoreName: string | null;
		toStoreName: string | null;
		itemNames?: string | null;
		remarks?: string | null;
		createdAt: string;
		updatedAt?: string | null;
		approvedByName?: string | null;
		approvedAt?: string | null;
		cancelledAt?: string | null;
		poCount?: number;
		canApprove?: boolean;
	};

	let list = $state<PrRow[]>([]);
	let loading = $state(false);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastInitHospitalId = $state<string | null>(null);
	let listAbort: AbortController | null = null;

	const PR_STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
		{ label: 'Draft', value: String(InvPrStatusTaggingEnum.DRAFT) },
		{ label: 'Pending', value: String(InvPrStatusTaggingEnum.PENDING) },
		{ label: 'Approved', value: String(InvPrStatusTaggingEnum.APPROVED) },
		{ label: 'Rejected', value: String(InvPrStatusTaggingEnum.REJECTED) },
		{ label: 'Cancelled', value: String(InvPrStatusTaggingEnum.CANCELLED) }
	];

	let cancelPrId = $state<string | null>(null);

	const prNewPath = $derived(
		hekaHospitalPageUrl(hospitalId, '/heka/home/inventory/purchase-requisition/new' as any)
	);

	function prViewHref(prId: string) {
		return `/heka/hospital/${hospitalId}/home/inventory/purchase-requisition/${encodeURIComponent(prId)}`;
	}

	function prEditHref(prId: string) {
		return `/heka/hospital/${hospitalId}/home/inventory/purchase-requisition/${encodeURIComponent(prId)}/edit`;
	}

	function prApproveHref(prId: string) {
		const u = hekaHospitalPageUrl(
			hospitalId,
			'/heka/home/inventory/purchase-requisition/approve' as any
		);
		return resolve(u as any) + '?prId=' + encodeURIComponent(prId);
	}

	function prRowEditVisible(row: PrRow): boolean {
		return (
			row.statusTaggingId === InvPrStatusTaggingEnum.DRAFT ||
			row.statusTaggingId === InvPrStatusTaggingEnum.PENDING ||
			row.statusTaggingId === InvPrStatusTaggingEnum.SENT_BACK ||
			row.statusTaggingId === InvPrStatusTaggingEnum.REJECTED
		);
	}

	function prRowCanEdit(row: PrRow): boolean {
		if (!prRowEditVisible(row)) return false;
		if (!currentUserId) return false;
		return row.createdBy === currentUserId;
	}

	function prRowCanCancel(row: PrRow): boolean {
		if (row.statusTaggingId === InvPrStatusTaggingEnum.CANCELLED) return false;
		if ((row.poCount ?? 0) > 0) return false;
		const statusOk =
			row.statusTaggingId === InvPrStatusTaggingEnum.DRAFT ||
			row.statusTaggingId === InvPrStatusTaggingEnum.PENDING ||
			row.statusTaggingId === InvPrStatusTaggingEnum.REJECTED ||
			row.statusTaggingId === InvPrStatusTaggingEnum.SENT_BACK ||
			row.statusTaggingId === InvPrStatusTaggingEnum.APPROVED;
		if (!statusOk) return false;
		if (!currentUserId) return false;
		return row.createdBy === currentUserId;
	}

	async function openCancelDialog(row: PrRow) {
		cancelPrId = row.id;
		await dialogService.open({
			title: m.inv_pr_cancel(),
			modalClassName: 'max-w-md',
			component: InventoryCancelReasonDialogContent,
			props: {
				confirmLabel: m.inv_pr_cancel_confirm(),
				textareaAriaLabel: m.inv_pr_cancel_reason_prompt(),
				emptyReasonToastTitle: m.inv_pr_cancel(),
				emptyReasonToastDetail: m.inv_pr_cancel_reason_prompt(),
				runDestructive: submitCancelPrWithReason
			},
			onClose: () => {
				cancelPrId = null;
			}
		});
	}

	async function submitCancelPrWithReason(reason: string) {
		if (!hospitalId || !cancelPrId) return;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition/cancel`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ prId: cancelPrId, reason })
			}
		);
		if (!res.ok) {
			const t = await res.text();
			toastService.addToast(
				m.inv_pr_cancel(),
				StatusColorEnum.ERROR,
				t || String(res.status)
			);
			throw new Error('cancel_failed');
		}
		cancelPrId = null;
		await loadList();
	}

	async function loadList() {
		if (!hospitalId) return;
		loading = true;
		listAbort?.abort();
		listAbort = new AbortController();
		try {
			const pageSize = Number(pageSizeStr) || AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE;
			const sp = new URLSearchParams();
			sp.set('page', String(currentPage));
			sp.set('pageSize', String(pageSize));
			const prNo = tableFilters.prNo?.trim();
			if (prNo) sp.set('prNo', prNo);
			if (selectedInventoryFromStoreId != null) {
				sp.set('storeId', String(selectedInventoryFromStoreId));
			}
			const statusId = tableFilters.statusTaggingId?.trim();
			if (statusId) sp.set('statusTaggingId', statusId);

			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition?${sp.toString()}`,
				{ method: 'GET', signal: listAbort.signal }
			);
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as { data: PrRow[]; total?: number };
			list = j.data ?? [];
			total = j.total ?? 0;
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			toastError(
				toastService,
				m.entity_purchase_requisition(),
				m.toast_action_loaded_failed(),
				e
			);
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

	const columns: MariTableColumn<PrRow>[] = $derived([
		{
			id: 'prNo',
			header: m.inv_pr_no(),
			field: 'prNo',
			filterable: true,
			format: (v, row) => row.prNo ?? '—'
		},
		{
			id: 'storeId',
			header: m.inv_common_store(),
			field: 'storeId',
			filterable: false,
			format: (_v, row) => {
				const a = row.fromStoreName ?? '—';
				const b = row.toStoreName ?? '—';
				return `${a} → ${b}`;
			}
		},
		{
			id: 'statusTaggingId',
			header: m.status(),
			field: 'statusTaggingId',
			filterType: 'select',
			filterOptions: PR_STATUS_FILTER_OPTIONS,
			format: (_v, row) => row.statusName ?? row.statusCode ?? '—'
		},
		{
			id: 'itemNames',
			header: m.inv_common_item(),
			field: 'itemNames',
			filterable: false,
			cellClass: 'whitespace-pre-line',
			format: (_v, row) =>
				(row.itemNames ?? '')
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
					.join('\n') || '—'
		},
		{
			id: 'remarks',
			header: m.remark(),
			field: 'remarks',
			filterable: false,
			format: (_v, row) => row.remarks?.trim() || '—'
		}
	]);
</script>

<div class="mb-4 flex items-center justify-between">
	<h1 class="text-lg font-semibold">{m.inv_page_pr_title()}</h1>
	<DaisyUiButton className="d-btn-primary" onClick={() => void goto(resolve(prNewPath as any))}>
		<LucidePlus className="size-4" />
		{m.inv_pr_new_title()}
	</DaisyUiButton>
</div>

<div class={TableEnum.HEIGHT}>
	{#key hospitalId}
		<MariTable
			columns={columns as MariTableColumn[]}
			rows={list}
			isLoading={loading}
			bind:currentPage
			bind:pageSize={pageSizeStr}
			totalRowCount={total}
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
					loadList();
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
			{#snippet rowActions(row, rowIndex)}
				{@const r = row as PrRow}
				<div class="flex flex-col items-center gap-1">
					<DaisyUiTooltip
						tooltipText={m.inv_common_view()}
						className="d-tooltip-ghost d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-sm d-btn-ghost d-btn-square"
							disabled={loading}
							onClick={() => void goto(prViewHref(r.id))}
						>
							<LucideEye className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>

					{#if prRowEditVisible(r)}
						<DaisyUiTooltip
							tooltipText={m.inv_pr_edit()}
							className="d-tooltip-accent d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-sm d-btn-ghost d-btn-square text-accent"
								disabled={loading || !prRowCanEdit(r)}
								onClick={() => void goto(prEditHref(r.id))}
							>
								<LucidePencil className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					{/if}

					{#if r.statusTaggingId === InvPrStatusTaggingEnum.PENDING}
						<DaisyUiTooltip
							tooltipText={m.inv_nav_pr_approval()}
							className="d-tooltip-accent d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-sm d-btn-ghost d-btn-square text-accent"
								disabled={loading || r.canApprove !== true}
								onClick={() => {
									void goto(prApproveHref(r.id));
								}}
							>
								<LucideCircleCheck className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					{/if}

					<DaisyUiTooltip
						tooltipText={m.inv_pr_cancel()}
						className="d-tooltip-error d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-sm d-btn-ghost d-btn-square text-error"
							disabled={loading || !prRowCanCancel(r)}
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

