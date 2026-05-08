<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { InvPoStatusTaggingEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';

	let { data } = $props();
	const selectedInventoryFromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);
	const poNewPath = $derived(
		hekaHospitalPageUrl(hospitalId, '/heka/home/inventory/purchase-order/new' as any)
	);

	function purchaseOrderDetailHref(poId: string) {
		return `/heka/hospital/${hospitalId}/home/inventory/purchase-order/${encodeURIComponent(poId)}`;
	}

	function purchaseOrderApproveHref(poId: string) {
		const u = hekaHospitalPageUrl(
			hospitalId,
			'/heka/home/inventory/purchase-order/approve' as any
		);
		return resolve(u as any) + '?poId=' + encodeURIComponent(poId);
	}

	const toastService = new ToastService();

	type PoRow = {
		id: string;
		poNo?: string | null;
		prId: string | null;
		supplierId: number;
		statusTaggingId: number;
		currentLevel: number;
		totalAmount: string;
		statusName: string | null;
		supplierName: string | null;
		storeName?: string | null;
		itemNames?: string | null;
		canApprove?: boolean;
	};

	let list = $state<PoRow[]>([]);
	let loading = $state(false);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastInitHospitalId = $state<string | null>(null);
	let listAbort: AbortController | null = null;

	const STORE_FILTER_OPTIONS = $derived.by(() => {
		const nav = (
			data as {
				inventoryFromStoresForNav?: { id: number; storeName: string | null }[];
			}
		).inventoryFromStoresForNav;
		return (nav ?? [])
			.filter((s) => typeof s.id === 'number' && s.id > 0)
			.map((s) => ({
				value: String(s.id),
				label: s.storeName?.trim() || `Store ${s.id}`
			}));
	});

	const SUPPLIER_FILTER_OPTIONS = $derived.by(() => {
		const seen = new Set<number>();
		const out: { value: string; label: string }[] = [];
		for (const r of list) {
			if (typeof r.supplierId !== 'number' || r.supplierId <= 0) continue;
			if (seen.has(r.supplierId)) continue;
			seen.add(r.supplierId);
			out.push({
				value: String(r.supplierId),
				label: r.supplierName?.trim() || `Supplier ${r.supplierId}`
			});
		}
		out.sort((a, b) => a.label.localeCompare(b.label));
		return out;
	});

	const PO_STATUS_FILTER_OPTIONS = $derived([
		{ label: m.inv_po_filter_status_draft(), value: String(InvPoStatusTaggingEnum.DRAFT) },
		{ label: m.inv_po_filter_status_pending(), value: String(InvPoStatusTaggingEnum.PENDING) },
		{ label: m.inv_po_filter_status_approved(), value: String(InvPoStatusTaggingEnum.APPROVED) },
		{ label: m.inv_po_filter_status_rejected(), value: String(InvPoStatusTaggingEnum.REJECTED) },
		{
			label: m.inv_po_filter_status_sent_to_supplier(),
			value: String(InvPoStatusTaggingEnum.SENT_TO_SUPPLIER)
		},
		{
			label: m.inv_po_filter_status_partially_received(),
			value: String(InvPoStatusTaggingEnum.PARTIALLY_RECEIVED)
		},
		{ label: m.inv_po_filter_status_closed(), value: String(InvPoStatusTaggingEnum.CLOSED) }
	]);

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
			if (selectedInventoryFromStoreId != null) {
				sp.set('storeId', String(selectedInventoryFromStoreId));
			}
			const poNo = tableFilters.poNo?.trim();
			if (poNo) sp.set('poNo', poNo);
			const statusId = tableFilters.statusTaggingId?.trim();
			if (statusId) sp.set('statusTaggingId', statusId);
			const storeId = tableFilters.storeId?.trim();
			if (storeId) sp.set('storeId', storeId);
			const supplierId = tableFilters.supplierId?.trim();
			if (supplierId) sp.set('supplierId', supplierId);
			const totalAmount = tableFilters.totalAmount?.trim();
			if (totalAmount) sp.set('totalAmount', totalAmount);
			const item = tableFilters.item?.trim();
			if (item) sp.set('item', item);

			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order?${sp.toString()}`,
				{ method: 'GET', signal: listAbort.signal }
			);
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as { data: PoRow[]; total?: number };
			list = j.data ?? [];
			total = j.total ?? 0;
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			toastService.addErrorToast(m.inv_page_po_title(), e);
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

	const columns: MariTableColumn<PoRow>[] = $derived([
		{
			id: 'poNo',
			header: m.inv_po_no(),
			field: 'poNo',
			filterable: true,
			format: (_v, row) => row.poNo ?? '—'
		},
		{
			id: 'storeId',
			header: m.inv_common_store(),
			field: 'storeId',
			filterType: 'select',
			filterOptionsGetter: () => STORE_FILTER_OPTIONS,
			format: (_v, row) => row.storeName ?? '—'
		},
		{
			id: 'supplierId',
			header: m.inv_po_select_supplier(),
			field: 'supplierId',
			filterType: 'select',
			filterOptionsGetter: () => SUPPLIER_FILTER_OPTIONS,
			format: (_v, row) => row.supplierName ?? '—'
		},
		{
			id: 'statusTaggingId',
			header: m.status(),
			field: 'statusTaggingId',
			filterType: 'select',
			filterOptions: PO_STATUS_FILTER_OPTIONS,
			format: (_v, row) => row.statusName ?? '—'
		},
		{
			id: 'totalAmount',
			header: m.inv_po_line_total(),
			field: 'totalAmount',
			filterable: true
		},
		{
			id: 'item',
			header: m.inv_common_item(),
			field: 'itemNames',
			cellClass: 'whitespace-pre-line',
			filterable: true,
			format: (_v, row) =>
				(row.itemNames ?? '')
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
					.join('\n') || '—'
		}
	]);
</script>

<div class="mb-4 flex items-center justify-between">
	<h1 class="text-lg font-semibold">{m.inv_page_po_title()}</h1>
	<div class="flex flex-wrap gap-2">
		<DaisyUiButton
			className="d-btn-primary"
			onClick={() => void goto(resolve(poNewPath as any))}
		>
			<LucidePlus className="size-4" />
			{m.inv_po_new_title()}
		</DaisyUiButton>
		<DaisyUiButton
			className="d-btn-outline"
			onClick={() => void goto(resolve(poNewPath as any) + '?mode=manual')}
		>
			<LucidePlus className="size-4" />
			<span>Manual (no PR)</span>
		</DaisyUiButton>
	</div>
</div>
{#if selectedInventoryFromStoreId == null}
	<div class="d-alert d-alert-warning mb-3 text-sm" role="status">
		{m.inv_po_list_select_store_hint()}
	</div>
{/if}

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
					void loadList();
				}, 350);
			}}
			rowTooltipGetter={(row) => StringUtil.inventoryAuditRowTooltip(row)}
		>
			{#snippet rowActions(row, _rowIndex)}
				{@const r = row as PoRow}
				{@const canPrint =
					r.statusTaggingId === InvPoStatusTaggingEnum.APPROVED ||
					r.statusTaggingId === InvPoStatusTaggingEnum.SENT_TO_SUPPLIER ||
					r.statusTaggingId === InvPoStatusTaggingEnum.PARTIALLY_RECEIVED ||
					r.statusTaggingId === InvPoStatusTaggingEnum.CLOSED}
				<div class="flex items-center justify-center gap-1">
					<DaisyUiTooltip
						tooltipText={m.inv_common_view()}
						className="d-tooltip-ghost d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-sm d-btn-ghost d-btn-square"
							disabled={loading}
							onClick={() => void goto(purchaseOrderDetailHref(r.id))}
						>
							<LucideEye className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>

					{#if canPrint}
						<DaisyUiTooltip tooltipText="Print" className="d-tooltip-ghost d-tooltip-right">
							<DaisyUiButton
								className="d-btn-sm d-btn-ghost d-btn-square"
								disabled={loading}
								onClick={() => void goto(purchaseOrderDetailHref(r.id) + '?print=1')}
							>
								<LucidePrinter className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					{/if}

					{#if r.statusTaggingId === InvPoStatusTaggingEnum.PENDING}
						{@const approveDisabled = loading || r.canApprove !== true}
						<DaisyUiTooltip
							tooltipText={
								approveDisabled
									? 'Approval not available (no permission for this level)'
									: m.inv_nav_po_approval()
							}
							className={`d-tooltip-right ${approveDisabled ? 'd-tooltip-ghost cursor-not-allowed' : 'd-tooltip-accent'}`}
						>
							<DaisyUiButton
								className={`d-btn-sm d-btn-ghost d-btn-square ${approveDisabled ? '' : 'text-accent'}`}
								disabled={approveDisabled}
								onClick={() => {
									void goto(purchaseOrderApproveHref(r.id));
								}}
							>
								<LucideCircleCheck className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					{/if}
				</div>
			{/snippet}
		</MariTable>
	{/key}
</div>
