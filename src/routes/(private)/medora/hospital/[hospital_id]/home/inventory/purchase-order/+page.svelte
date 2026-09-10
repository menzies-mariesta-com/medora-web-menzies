<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { InvPoStatusTaggingEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';

	let { data } = $props();
	const selectedInventoryFromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const poNewPath = $derived(
		medoraHospitalPageUrl(
			hospitalId,
			'/medora/home/inventory/purchase-order/new' as any
		)
	);

	function purchaseOrderDetailHref(poId: string) {
		return `/medora/hospital/${hospitalId}/home/inventory/purchase-order/${encodeURIComponent(poId)}`;
	}

	function purchaseOrderApproveHref(poId: string) {
		const u = medoraHospitalPageUrl(
			hospitalId,
			'/medora/home/inventory/purchase-order/approve' as any
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
		prFromStoreName?: string | null;
		itemNames?: string | null;
		canApprove?: boolean;
	};

	let list = $state<PoRow[]>([]);
	let loading = $state(false);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null =
		null;
	let lastInitHospitalId = $state<string | null>(null);
	let listAbort: AbortController | null = null;

	const PO_STATUS_FILTER_OPTIONS = $derived([
		{
			label: m.inv_po_filter_status_draft(),
			value: String(InvPoStatusTaggingEnum.DRAFT)
		},
		{
			label: m.inv_po_filter_status_pending(),
			value: String(InvPoStatusTaggingEnum.PENDING)
		},
		{
			label: m.inv_po_filter_status_approved(),
			value: String(InvPoStatusTaggingEnum.APPROVED)
		},
		{
			label: m.inv_po_filter_status_rejected(),
			value: String(InvPoStatusTaggingEnum.REJECTED)
		},
		{
			label: m.inv_po_filter_status_sent_to_supplier(),
			value: String(InvPoStatusTaggingEnum.SENT_TO_SUPPLIER)
		},
		{
			label: m.inv_po_filter_status_partially_received(),
			value: String(InvPoStatusTaggingEnum.PARTIALLY_RECEIVED)
		},
		{
			label: m.inv_po_filter_status_closed(),
			value: String(InvPoStatusTaggingEnum.CLOSED)
		}
	]);

	async function loadList() {
		if (!hospitalId) return;
		loading = true;
		listAbort?.abort();
		listAbort = new AbortController();
		try {
			const pageSize =
				Number(pageSizeStr) || AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE;
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
			const supplierId = tableFilters.supplierId?.trim();
			if (supplierId) sp.set('supplierId', supplierId);
			const totalAmount = tableFilters.totalAmount?.trim();
			if (totalAmount) sp.set('totalAmount', totalAmount);
			const item = tableFilters.item?.trim();
			if (item) sp.set('item', item);

			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/purchase-order?${sp.toString()}`,
				{ method: 'GET', signal: listAbort.signal }
			);
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as {
				data: PoRow[];
				total?: number;
			};
			list = j.data ?? [];
			total = j.total ?? 0;
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError')
				return;
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

	const columns: MenziesTableColumn<PoRow>[] = $derived([
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
			filterable: false,
			format: (_v, row) => row.storeName ?? '—'
		},
		{
			id: 'prFromStoreName',
			header: m.inv_po_pr_from_store(),
			field: 'prFromStoreName',
			filterable: false,
			format: (_v, row) =>
				row.prId && row.prFromStoreName?.trim()
					? row.prFromStoreName.trim()
					: '—'
		},
		{
			id: 'supplierId',
			header: m.inv_po_select_supplier(),
			field: 'supplierId',
			filterType: 'select',
			filterMasterKey: 'supplier',
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
		<WashButton
			className="btn-primary"
			onClick={() => void goto(resolve(poNewPath as any))}
		>
			<LucidePlus className="size-4" />
			{m.inv_po_new_title()}
		</WashButton>
		<WashButton
			className="btn-outline"
			onClick={() =>
				void goto(resolve(poNewPath as any) + '?mode=manual')}
		>
			<LucidePlus className="size-4" />
			<span>Manual (no PR)</span>
		</WashButton>
	</div>
</div>
{#if selectedInventoryFromStoreId == null}
	<div class="mb-3 alert text-sm alert-warning" role="status">
		{m.inv_po_list_select_store_hint()}
	</div>
{/if}

<div class={TableEnum.HEIGHT}>
	{#key hospitalId}
		<MenziesTable
			columns={columns as MenziesTableColumn[]}
			rows={list}
			masterFilterHospitalId={hospitalId}
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
		>
			{#snippet rowActions(row, _rowIndex)}
				{@const r = row as PoRow}
				{@const canPrint =
					r.statusTaggingId === InvPoStatusTaggingEnum.APPROVED ||
					r.statusTaggingId ===
						InvPoStatusTaggingEnum.SENT_TO_SUPPLIER ||
					r.statusTaggingId ===
						InvPoStatusTaggingEnum.PARTIALLY_RECEIVED ||
					r.statusTaggingId === InvPoStatusTaggingEnum.CLOSED}
				{@const approveDisabled =
					loading || r.canApprove !== true}
				<MenziesTableRowActionGroup>
					<MenziesTableIconAction
						tooltipText={m.inv_common_view()}
						color="primary"
						disabled={loading}
						onClick={() => void goto(purchaseOrderDetailHref(r.id))}
					>
						{#snippet icon()}
							<LucideEye className="size-3.5" />
						{/snippet}
					</MenziesTableIconAction>

					{#if canPrint}
						<MenziesTableIconAction
							tooltipText="Print"
							disabled={loading}
							onClick={() =>
								void goto(
									purchaseOrderDetailHref(r.id) + '?print=1'
								)}
						>
							{#snippet icon()}
								<LucidePrinter className="size-3.5" />
							{/snippet}
						</MenziesTableIconAction>
					{/if}

					{#if r.statusTaggingId === InvPoStatusTaggingEnum.PENDING}
						<MenziesTableIconAction
							tooltipText={approveDisabled
								? 'Approval not available (no permission for this level)'
								: m.inv_nav_po_approval()}
							color="accent"
							disabled={approveDisabled}
							onClick={() => {
								void goto(purchaseOrderApproveHref(r.id));
							}}
						>
							{#snippet icon()}
								<LucideCircleCheck className="size-3.5" />
							{/snippet}
						</MenziesTableIconAction>
					{/if}
				</MenziesTableRowActionGroup>
			{/snippet}
		</MenziesTable>
	{/key}
</div>
