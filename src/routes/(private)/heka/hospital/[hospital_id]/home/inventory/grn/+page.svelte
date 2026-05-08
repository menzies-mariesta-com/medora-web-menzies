<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';
	import { m } from '$lib/paraglide/messages';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { InvGrnStatusTaggingEnum } from '$lib/model/enum/db-link';

	const dt = new DateTimeUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	let { data } = $props();
	const selectedInventoryFromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);

	const toastService = new ToastService();

	type GrnRow = {
		id: string;
		poId: string | null;
		poNo?: string | null;
		poPrId?: string | null;
		grnTransferDone?: boolean;
		storeId: number;
		storeName?: string | null;
		supplierName?: string | null;
		receivedDate: string;
		statusTaggingId: number;
		statusName?: string | null;
		invoiceNo?: string | null;
		invoiceDate?: string | null;
		invoiceAmount?: string | null;
		invoicePhotoUrl?: string | null;
		createdAt?: string | null;
		updatedAt?: string | null;
		receivedByName?: string | null;
		cancelledAt?: string | null;
	};

	let list = $state<GrnRow[]>([]);
	let listLoading = $state(false);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastInitHospitalId = $state<string | null>(null);
	let listAbort: AbortController | null = null;
	let transferSubmittingId = $state<string | null>(null);
	let canPost = $state(false);
	let canPostLoading = $state(false);

	const GRN_STATUS_FILTER_OPTIONS = $derived([
		{ label: m.inv_grn_filter_status_draft(), value: String(InvGrnStatusTaggingEnum.DRAFT) },
		{ label: m.inv_grn_filter_status_posted(), value: String(InvGrnStatusTaggingEnum.POSTED) },
		{ label: m.inv_grn_filter_status_cancelled(), value: String(InvGrnStatusTaggingEnum.CANCELLED) }
	]);

	const grnNewPath = $derived(
		hekaHospitalPageUrl(hospitalId, '/heka/home/inventory/grn/new' as any)
	);

	function canTransferGrnToRequestingStore(row: GrnRow): boolean {
		return (
			row.poId != null &&
			row.poId !== '' &&
			row.poPrId != null &&
			row.poPrId !== '' &&
			row.grnTransferDone !== true &&
			selectedInventoryFromStoreId != null &&
			row.storeId === selectedInventoryFromStoreId
		);
	}

	async function loadList() {
		if (!hospitalId) return;
		listLoading = true;
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
			const invoiceNo = tableFilters.invoiceNo?.trim();
			if (invoiceNo) sp.set('invoiceNo', invoiceNo);
			const statusId = tableFilters.statusTaggingId?.trim();
			if (statusId) sp.set('statusTaggingId', statusId);

			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/grn?${sp.toString()}`,
				{ method: 'GET', signal: listAbort.signal }
			);
			if (!res.ok) {
				toastService.addToast(
					m.inv_page_grn_title(),
					StatusColorEnum.ERROR,
					`HTTP ${res.status}`
				);
				return;
			}
			const j = (await res.json()) as { data: GrnRow[]; total?: number };
			list = j.data ?? [];
			total = j.total ?? 0;
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError') return;
			toastService.addErrorToast(m.inv_page_grn_title(), e);
		} finally {
			listLoading = false;
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

	$effect(() => {
		const hid = hospitalId;
		const sid = selectedInventoryFromStoreId;
		if (!hid || sid == null) {
			canPost = false;
			return;
		}
		canPostLoading = true;
		fetch(
			`/api/heka/hospital/${hid}/home/inventory/grn?mode=canPost&storeId=${encodeURIComponent(String(sid))}`,
			{ method: 'GET' }
		)
			.then((r) => (r.ok ? r.json() : null))
			.then((j: any) => {
				canPost = Boolean(j?.canPost);
			})
			.catch(() => {
				canPost = false;
			})
			.finally(() => {
				canPostLoading = false;
			});
	});

	async function transferToRequestingStore(row: GrnRow) {
		if (!hospitalId || !row.poId) return;
		transferSubmittingId = row.id;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/grn/transfer-to-requesting-store`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ grnId: row.id })
				}
			);
			if (!res.ok) {
				const t = await res.text();
				toastService.addToast(
					m.inv_grn_transfer_to_requesting(),
					StatusColorEnum.ERROR,
					t || String(res.status)
				);
				return;
			}
			toastService.addToast(m.inv_common_success(), StatusColorEnum.SUCCESS);
			await loadList();
		} catch (e) {
			toastService.addErrorToast('Transfer', e);
		} finally {
			transferSubmittingId = null;
		}
	}

	function grnDetailUrl(grnId: string) {
		return `/heka/hospital/${hospitalId}/home/inventory/grn/${encodeURIComponent(grnId)}`;
	}

	const columns: MariTableColumn<GrnRow>[] = $derived([
		{
			id: 'storeName',
			header: m.inv_grn_col_store(),
			field: 'storeName',
			filterable: false,
			format: (_v, row) => row.storeName ?? '—'
		},
		{
			id: 'poNo',
			header: m.inv_grn_col_po(),
			field: 'poNo',
			filterable: true,
			format: (_v, row) =>
				row.poId
					? row.poNo?.trim()
						? row.poNo
						: m.inv_grn_select_po()
					: '—',
		},
		{
			id: 'retransfer',
			header: m.inv_grn_col_retransfer(),
			field: 'grnTransferDone',
			filterable: false,
			format: (_v, row) => {
				if (!row.poId) return '—';
				if (row.poPrId == null || row.poPrId === '')
					return m.inv_grn_retransfer_no_pr();
				if (row.grnTransferDone) return m.inv_grn_transfer_status_done();
				return m.inv_grn_transfer_status_pending();
			}
		},
		{
			id: 'supplierName',
			header: m.inv_po_select_supplier(),
			field: 'supplierName',
			filterable: false,
			format: (_v, row) => row.supplierName ?? '—'
		},
		{
			id: 'invoiceNo',
			header: m.inv_grn_invoice_no(),
			field: 'invoiceNo',
			filterable: true,
			format: (_v, row) => row.invoiceNo?.trim() || '—'
		},
		{
			id: 'invoiceDate',
			header: m.inv_grn_invoice_date(),
			field: 'invoiceDate',
			filterable: false,
			format: (_v, row) => dt.formatDate(row.invoiceDate)
		},
		{
			id: 'invoiceAmount',
			header: m.inv_grn_invoice_amount(),
			field: 'invoiceAmount',
			filterable: false,
			format: (_v, row) => {
				const raw = row.invoiceAmount?.trim();
				if (!raw) return '—';
				const n = Number(raw);
				if (!Number.isFinite(n)) return raw;
				return new Intl.NumberFormat(undefined, {
					minimumFractionDigits: 0,
					maximumFractionDigits: 4
				}).format(n);
			}
		},
		{
			id: 'receivedDate',
			header: m.inv_grn_received_date(),
			field: 'receivedDate',
			filterable: false,
			format: (_v, row) => dt.formatDate(row.receivedDate)
		},
		{
			id: 'statusTaggingId',
			header: m.status(),
			field: 'statusTaggingId',
			filterType: 'select',
			filterOptions: GRN_STATUS_FILTER_OPTIONS,
			format: (_v, row) => row.statusName ?? '—'
		},
		{
			id: 'receivedByName',
			header: m.inv_common_received_by(),
			field: 'receivedByName',
			widthClass: TableRowEnum.FULL_NAME_COLUMN_WIDTH,
			filterable: false,
			format: (_v, row) => row.receivedByName ?? '—'
		}
	]);
</script>

<div class="mb-4 flex items-center justify-between">
	<h1 class="text-lg font-semibold">{m.inv_page_grn_title()}</h1>
	<div class="flex flex-wrap gap-2">
		<DaisyUiButton
			className="d-btn-primary"
			disabled={selectedInventoryFromStoreId == null || !canPost || canPostLoading}
			onClick={() => void goto(resolve(grnNewPath as any))}
		>
			<LucidePlus className="size-4" />
			{m.inv_grn_new_title()}
		</DaisyUiButton>
		<DaisyUiButton
			className="d-btn-outline"
			disabled={selectedInventoryFromStoreId == null || !canPost || canPostLoading}
			onClick={() =>
				void goto(resolve(grnNewPath as any) + '?mode=direct')}
		>
			<LucidePlus className="size-4" />
			<span>Direct (no PO)</span>
		</DaisyUiButton>
	</div>
</div>

<div class={TableEnum.HEIGHT}>
	{#key hospitalId}
		<MariTable
			columns={columns as MariTableColumn[]}
			rows={list}
			isLoading={listLoading}
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
			rowTooltipGetter={(row) =>
				StringUtil.inventoryAuditRowTooltip(
					row as {
						createdAt?: string | null;
						updatedAt?: string | null;
						createdByName?: string | null;
						updatedByName?: string | null;
						cancelledAt?: string | null;
						cancelledByName?: string | null;
					}
				)}
		>
			{#snippet rowActions(row, _i)}
				{@const r = row as GrnRow}
				<div class="flex flex-col items-center gap-1">
					<DaisyUiTooltip tooltipText={m.inv_common_view()} className="d-tooltip-ghost d-tooltip-right">
						<DaisyUiButton
							className="d-btn-sm d-btn-ghost d-btn-square"
							onClick={() => void goto(resolve(grnDetailUrl(r.id) as any))}
						>
							<LucideEye className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
					{#if canTransferGrnToRequestingStore(r)}
						<DaisyUiTooltip
							tooltipText={m.inv_grn_transfer_to_requesting()}
							className="d-tooltip-primary d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-sm d-btn-ghost d-btn-square text-primary"
								loading={transferSubmittingId === r.id}
								disabled={transferSubmittingId != null || !canPost || canPostLoading}
								onClick={() => void transferToRequestingStore(r)}
							>
								<LucideChevronRight className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					{/if}
				</div>
			{/snippet}
		</MariTable>
	{/key}
</div>
