<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideBan from '$lib/component/own/library/lucide/LucideBan.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import PrCancelModal from '$lib/component/own/local/private/heka/inventory/purchase-requisition/PrCancelModal.svelte';
	import PrLineItemsCard from '$lib/component/own/local/private/heka/inventory/purchase-requisition/PrLineItemsCard.svelte';
	import PrLineItemModal from '$lib/component/own/local/private/heka/inventory/purchase-requisition/PrLineItemModal.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';
	import { m } from '$lib/paraglide/messages';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { InvPrStatusTaggingEnum } from '$lib/model/enum/db-link';
	import { toastError } from '$lib/util/toast-copy.util';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	const toastService = new ToastService();

	type PrRow = {
		id: string;
		prNo?: string | null;
		storeId: number;
		statusTaggingId: number;
		currentLevel: number;
		statusName: string | null;
		statusCode: string | null;
		storeName: string | null;
		createdAt: string;
		updatedAt?: string | null;
		approvedByName?: string | null;
		cancelledAt?: string | null;
		poCount?: number;
		/** Present on list API: user may act at currentLevel for this store. */
		canApprove?: boolean;
	};

	type IumOpt = {
		id: number;
		conversionDisplay: string;
		purchaseUnitId: number;
		issueUnitId: number;
	};

	type PrLineForm = {
		key: string;
		itemSearch: string;
		hits: { id: number; itemName: string | null }[];
		itemId: number | null;
		itemLabel: string;
		quantity: string;
		iumList: IumOpt[];
		itemUnitMasterId: number | null;
	};

	let viewMode = $state<'list' | 'create' | 'edit' | 'view'>('list');
	let editPrId = $state<string | null>(null);

	let list = $state<PrRow[]>([]);
	let loading = $state(false);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSizeStr = $state(`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`);
	let tableFilters = $state<Record<string, string>>({});
	let filterDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
	let lastInitHospitalId = $state<string | null>(null);
	let storesAbort: AbortController | null = null;
	let listAbort: AbortController | null = null;

	const PR_STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
		{ label: 'Draft', value: String(InvPrStatusTaggingEnum.DRAFT) },
		{ label: 'Pending', value: String(InvPrStatusTaggingEnum.PENDING) },
		{ label: 'Approved', value: String(InvPrStatusTaggingEnum.APPROVED) },
		{ label: 'Rejected', value: String(InvPrStatusTaggingEnum.REJECTED) },
		{ label: 'Sent Back', value: String(InvPrStatusTaggingEnum.SENT_BACK) },
		{ label: 'Cancelled', value: String(InvPrStatusTaggingEnum.CANCELLED) }
	];

	let stores = $state<{ id: number; storeName: string | null }[]>([]);
	let createStoreId = $state<number | null>(null);
	let createRemarks = $state('');
	let createLines = $state<PrLineForm[]>([]);
	let createSubmitting = $state(false);

	let headerPrNo = $state<string | null>(null);
	let headerStatusLabel = $state<string>('Draft');
	let headerStatusCode = $state<string | null>(null);

	let lineItemFilter = $state('');

	let lineDialogOpen = $state(false);
	let editingLineKey = $state<string | null>(null);
	let draftLine = $state<PrLineForm>(newLine());
	let lineDialogSubmitting = $state(false);

	let cancelDialogOpen = $state(false);
	let cancelPrId = $state<string | null>(null);
	let cancelReasonDraft = $state('');
	let cancelSubmitting = $state(false);

	function prRowCanEdit(row: PrRow): boolean {
		return (
			row.statusTaggingId === InvPrStatusTaggingEnum.DRAFT ||
			row.statusTaggingId === InvPrStatusTaggingEnum.PENDING ||
			row.statusTaggingId === InvPrStatusTaggingEnum.SENT_BACK ||
			row.statusTaggingId === InvPrStatusTaggingEnum.REJECTED
		);
	}

	function prRowCanCancel(row: PrRow): boolean {
		if (row.statusTaggingId === InvPrStatusTaggingEnum.CANCELLED) return false;
		if ((row.poCount ?? 0) > 0) return false;
		return (
			row.statusTaggingId === InvPrStatusTaggingEnum.DRAFT ||
			row.statusTaggingId === InvPrStatusTaggingEnum.PENDING ||
			row.statusTaggingId === InvPrStatusTaggingEnum.REJECTED ||
			row.statusTaggingId === InvPrStatusTaggingEnum.SENT_BACK ||
			row.statusTaggingId === InvPrStatusTaggingEnum.APPROVED
		);
	}

	function openCancelDialog(row: PrRow) {
		cancelPrId = row.id;
		cancelReasonDraft = '';
		cancelDialogOpen = true;
	}

	function closeCancelDialog() {
		cancelDialogOpen = false;
		cancelPrId = null;
		cancelReasonDraft = '';
	}

	async function submitCancelPr() {
		if (!hospitalId || !cancelPrId) return;
		const reason = cancelReasonDraft.trim();
		if (!reason) {
			toastService.addToast(
				m.inv_pr_cancel(),
				StatusColorEnum.ERROR,
				m.inv_pr_cancel_reason_prompt()
			);
			return;
		}
		cancelSubmitting = true;
		try {
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
				return;
			}
			closeCancelDialog();
			await loadList();
		} finally {
			cancelSubmitting = false;
		}
	}

	async function searchItemsForPrLine(q: string) {
		const qEnc = encodeURIComponent(q.trim());
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?name=${qEnc}&pageSize=${AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT}`
		);
		const j = await res.json();
		return (j.data ?? []).map((x: any) => ({
			label: x.itemName ?? '—',
			value: String(x.id)
		}));
	}

	function newLine(): PrLineForm {
		return {
			key: crypto.randomUUID(),
			itemSearch: '',
			hits: [],
			itemId: null,
			itemLabel: '',
			quantity: '1',
			iumList: [],
			itemUnitMasterId: null
		};
	}

	function conversionLabelForLine(line: PrLineForm): string {
		const ium = line.iumList.find((u) => u.id === line.itemUnitMasterId);
		return ium?.conversionDisplay ?? '—';
	}

	function openLineDialogForCreate() {
		editingLineKey = null;
		draftLine = newLine();
		lineDialogOpen = true;
	}

	function openLineDialogForEdit(line: PrLineForm) {
		editingLineKey = line.key;
		// Shallow copy is enough; we treat iumList as read-only selections.
		draftLine = {
			...line,
			hits: [...line.hits],
			iumList: [...line.iumList]
		};
		lineDialogOpen = true;
	}

	function closeLineDialog() {
		lineDialogOpen = false;
		editingLineKey = null;
		lineDialogSubmitting = false;
	}

	async function pickDraftItem(itemId: number) {
		await hydrateLineItemMeta(draftLine, itemId);
		draftLine = { ...draftLine };
	}

	function validateDraftLine():
		| { ok: true; quantity: string; unitId: number; itemId: number }
		| { ok: false; title: string; detail: string } {
		const unitId = purchaseUnitForLine(draftLine);
		if (draftLine.itemId == null || unitId == null) {
			return {
				ok: false,
				title: 'Could not save line',
				detail: 'Please select an item and a purchase unit conversion.'
			};
		}
		const q = draftLine.quantity.trim();
		if (!q || !Number.isFinite(Number(q)) || Number(q) <= 0) {
			return {
				ok: false,
				title: 'Could not save line',
				detail: 'Quantity must be greater than 0.'
			};
		}
		return { ok: true, quantity: q, unitId, itemId: draftLine.itemId };
	}

	function saveDraftLine() {
		const v = validateDraftLine();
		if (!v.ok) {
			toastService.addToast(v.title, StatusColorEnum.ERROR, v.detail);
			return;
		}

		lineDialogSubmitting = true;
		try {
			if (editingLineKey) {
				const idx = createLines.findIndex((l) => l.key === editingLineKey);
				if (idx >= 0) {
					const next = [...createLines];
					next[idx] = { ...draftLine, quantity: v.quantity };
					createLines = next;
				}
			} else {
				createLines = [...createLines, { ...draftLine, quantity: v.quantity }];
			}
			closeLineDialog();
		} finally {
			lineDialogSubmitting = false;
		}
	}

	function deleteLine(lineKey: string) {
		createLines = createLines.filter((l) => l.key !== lineKey);
	}

	async function loadStores() {
		if (!hospitalId) return;
		storesAbort?.abort();
		storesAbort = new AbortController();
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/approval-config?mode=stores`,
			{ method: 'GET', signal: storesAbort.signal }
		);
		stores = (await res.json()) as typeof stores;
		if (stores.length && createStoreId == null) createStoreId = stores[0].id;
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
			const storeId = tableFilters.storeId?.trim();
			if (storeId) sp.set('storeId', storeId);
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
			// Aborts are expected when paging/filtering quickly or on reactive re-runs.
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



	async function hydrateLineItemMeta(line: PrLineForm, itemId: number) {
		if (!hospitalId) return;
		line.itemId = itemId;
		const [detailRes, iumRes] = await Promise.all([
			fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?id=${itemId}`,
				{ method: 'GET' }
			),
			fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?mode=itemUnitMasters`,
				{ method: 'GET' }
			)
		]);
		const detail = (await detailRes.json()) as {
			itemName?: string | null;
			itemUnitMasterIds?: number[];
			defaultItemUnitMasterId?: number | null;
		};
		const itemLabel = detail.itemName ?? '—';
		line.itemLabel = itemLabel;
		line.itemSearch = itemLabel;
		const allIum = (await iumRes.json()) as IumOpt[];
		const allowed = new Set(detail.itemUnitMasterIds ?? []);
		line.iumList = allIum.filter((u) => allowed.has(u.id));
		const def = detail.defaultItemUnitMasterId;
		line.itemUnitMasterId =
			def != null && line.iumList.some((u) => u.id === def)
				? def
				: (line.iumList[0]?.id ?? null);
	}

	async function pickItem(line: PrLineForm, itemId: number) {
		await hydrateLineItemMeta(line, itemId);
		createLines = [...createLines];
	}

	async function hydrateLineFromPrDetail(
		line: PrLineForm,
		apiLine: { itemId: number; quantity: string; unitId: number; itemName?: string | null }
	) {
		line.quantity = String(apiLine.quantity ?? '0');
		await hydrateLineItemMeta(line, apiLine.itemId);
		if (apiLine.itemName) {
			line.itemLabel = apiLine.itemName;
			line.itemSearch = apiLine.itemName;
		}
		const match = line.iumList.find((u) => u.purchaseUnitId === apiLine.unitId);
		if (match) line.itemUnitMasterId = match.id;
	}

	function purchaseUnitForLine(line: PrLineForm): number | null {
		const ium = line.iumList.find((u) => u.id === line.itemUnitMasterId);
		return ium?.purchaseUnitId ?? null;
	}

	function buildLinesPayload():
		| { ok: true; lines: { itemId: number; quantity: string; unitId: number }[] }
		| { ok: false; title: string; detail: string } {
		const linesPayload: { itemId: number; quantity: string; unitId: number }[] = [];
		for (const ln of createLines) {
			const uid = purchaseUnitForLine(ln);
			if (ln.itemId == null || uid == null) {
				return {
					ok: false,
					title: 'Could not save PR',
					detail: 'Each line needs an item and unit conversion.'
				};
			}
			const q = ln.quantity.trim();
			if (!q || !Number.isFinite(Number(q)) || Number(q) <= 0) {
				return {
					ok: false,
					title: 'Could not save PR',
					detail: 'Invalid quantity on a line.'
				};
			}
			linesPayload.push({ itemId: ln.itemId, quantity: q, unitId: uid });
		}
		if (linesPayload.length === 0) {
			return {
				ok: false,
				title: 'Could not save PR',
				detail: 'Add at least one line.'
			};
		}
		return { ok: true, lines: linesPayload };
	}

	async function submitPrForm() {
		if (!hospitalId || createStoreId == null) return;
		const built = buildLinesPayload();
		if (!built.ok) {
			toastService.addToast(built.title, StatusColorEnum.ERROR, built.detail);
			return;
		}
		createSubmitting = true;
		try {
			if (editPrId) {
				const res = await fetch(
					`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition`,
					{
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							id: editPrId,
							remarks: createRemarks.trim() || null,
							lines: built.lines
						})
					}
				);
				if (!res.ok) {
					const text = await res.text().catch(() => '');
					toastService.addToast(
						'Could not update PR',
						StatusColorEnum.ERROR,
						text || res.statusText
					);
					return;
				}
			} else {
				const res = await fetch(
					`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							storeId: createStoreId,
							remarks: createRemarks.trim() || null,
							lines: built.lines
						})
					}
				);
				if (!res.ok) {
					const text = await res.text().catch(() => '');
					toastService.addToast(
						'Could not create PR',
						StatusColorEnum.ERROR,
						text || res.statusText
					);
					return;
				}
			}
			viewMode = 'list';
			editPrId = null;
			createRemarks = '';
			createLines = [];
			await loadList();
		} finally {
			createSubmitting = false;
		}
	}

	function openCreate() {
		editPrId = null;
		viewMode = 'create';
		headerPrNo = null;
		headerStatusLabel = 'Draft';
		headerStatusCode = null;
		// Do not auto-add an empty line item; user manages lines via dialog.
		void loadStores();
	}

	async function openEdit(row: PrRow) {
		if (!hospitalId || !prRowCanEdit(row)) return;
		headerPrNo = row.prNo ?? null;
		headerStatusLabel = row.statusName ?? row.statusCode ?? '—';
		headerStatusCode = row.statusCode ?? null;
		await loadStores();
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition?id=${encodeURIComponent(row.id)}`,
			{ method: 'GET' }
		);
		if (!res.ok) {
			toastService.addToast(
				m.inv_pr_edit(),
				StatusColorEnum.ERROR,
				await res.text().catch(() => String(res.status))
			);
			return;
		}
		const detail = (await res.json()) as {
			storeId: number;
			remarks: string | null;
			lines: {
				itemId: number;
				quantity: string;
				unitId: number;
				itemName?: string | null;
			}[];
		};
		if (!detail?.lines?.length) {
			toastService.addToast(m.inv_pr_edit(), StatusColorEnum.ERROR, 'PR has no lines.');
			return;
		}
		editPrId = row.id;
		createStoreId = detail.storeId;
		createRemarks = detail.remarks ?? '';
		const nextLines: PrLineForm[] = [];
		for (const l of detail.lines) {
			const line = newLine();
			await hydrateLineFromPrDetail(line, l);
			nextLines.push(line);
		}
		createLines = nextLines;
		viewMode = 'edit';
	}

	async function openView(row: PrRow) {
		if (!hospitalId) return;
		headerPrNo = row.prNo ?? null;
		headerStatusLabel = row.statusName ?? row.statusCode ?? '—';
		headerStatusCode = row.statusCode ?? null;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition?id=${encodeURIComponent(row.id)}`,
			{ method: 'GET' }
		);
		if (!res.ok) {
			toastService.addToast(
				'View PR',
				StatusColorEnum.ERROR,
				await res.text().catch(() => String(res.status))
			);
			return;
		}
		const detail = (await res.json()) as {
			storeId: number;
			remarks: string | null;
			lines: {
				itemId: number;
				quantity: string;
				unitId: number;
				itemName?: string | null;
			}[];
		};
		editPrId = row.id;
		createStoreId = detail.storeId;
		createRemarks = detail.remarks ?? '';
		const nextLines: PrLineForm[] = [];
		for (const l of detail.lines ?? []) {
			const line = newLine();
			await hydrateLineFromPrDetail(line, l);
			nextLines.push(line);
		}
		createLines = nextLines;
		viewMode = 'view';
	}

	$effect(() => {
		const h = hospitalId;
		if (!h) {
			list = [];
			total = 0;
			return;
		}
		// Guard against accidental effect re-runs (prevents request storms).
		if (lastInitHospitalId === h) return;
		lastInitHospitalId = h;
		currentPage = 1;
		tableFilters = {};
		void loadStores();
		void loadList();
	});

	const columns: MariTableColumn<PrRow>[] = [
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
			filterType: 'select',
			filterOptionsGetter: () =>
				stores.map((s) => ({
					label: s.storeName ?? '—',
					value: String(s.id)
				})),
			format: (_v, row) => row.storeName ?? '—'
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
			id: 'currentLevel',
			header: m.inv_common_level(),
			field: 'currentLevel',
			filterable: false,
			format: (v, row) => String(row.currentLevel)
		},
		{
			id: 'approvedByName',
			header: m.inv_common_approved_by(),
			field: 'approvedByName',
			widthClass: TableRowEnum.FULL_NAME_COLUMN_WIDTH,
			filterable: false,
			format: (v, row) => row.approvedByName ?? '—'
		}
	];

	const lineColumns: MariTableColumn<PrLineForm>[] = [
		{
			id: 'itemLabel',
			header: 'Item',
			field: 'itemLabel',
			filterable: false,
			format: (_v, row) => row.itemLabel || '—'
		},
		{
			id: 'conversion',
			header: 'Conversion',
			field: 'itemUnitMasterId',
			filterable: false,
			format: (_v, row) => conversionLabelForLine(row)
		},
		{
			id: 'quantity',
			header: 'Quantity',
			field: 'quantity',
			filterable: false,
			format: (_v, row) => row.quantity?.trim() || '—'
		}
	];

	const filteredLines = $derived.by(() => {
		const q = lineItemFilter.trim().toLowerCase();
		if (!q) return createLines;
		return createLines.filter((l) => {
			const item = (l.itemLabel ?? '').toLowerCase();
			const conv = conversionLabelForLine(l).toLowerCase();
			const qty = (l.quantity ?? '').toLowerCase();
			return item.includes(q) || conv.includes(q) || qty.includes(q);
		});
	});
</script>

{#if viewMode === 'list'}
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-lg font-semibold">{m.inv_page_pr_title()}</h1>
		<DaisyUiButton className="d-btn-primary" onClick={openCreate}>
			<LucidePlus className="size-4" />
			{m.inv_pr_new_title()}
		</DaisyUiButton>
	</div>

	<div class={TableEnum.HEIGHT}>
		{#key hospitalId}
			<MariTable
				{columns}
				rows={list}
				isLoading={loading}
				bind:currentPage
				bind:pageSize={pageSizeStr}
				totalRowCount={total}
				showRowActions={true}
				actionsVariant="none"
				showRefreshButton={true}
				refreshTooltip={m.refresh_data()}
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
				rowTooltipGetter={(row) => StringUtil.inventoryAuditRowTooltip(row)}
				on:refresh={() => loadList()}
			>
				{#snippet rowActions(row, rowIndex)}
				<div class="flex flex-col items-center gap-1">
					<DaisyUiTooltip
						tooltipText={m.inv_common_view()}
						className="d-tooltip-ghost d-tooltip-right"
					>
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm"
							disabled={loading}
							onClick={() => void openView(row)}
						>
							<LucideEye className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>

					{#if prRowCanEdit(row)}
						<DaisyUiTooltip
							tooltipText={m.inv_pr_edit()}
							className="d-tooltip-accent d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-sm d-btn-ghost d-btn-accent"
								disabled={loading}
								onClick={() => void openEdit(row)}
							>
								<LucidePencil className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					{/if}

					{#if row.statusTaggingId === InvPrStatusTaggingEnum.PENDING && row.canApprove}
						<DaisyUiTooltip
							tooltipText={m.inv_nav_pr_approval()}
							className="d-tooltip-accent d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-sm d-btn-ghost d-btn-accent"
								onClick={() => {
									const generatedUrl = hekaHospitalPageUrl(
										hospitalId,
										'/heka/home/inventory/purchase-requisition/approve' as any
									);
									// @ts-expect-error SvelteKit resolve types mismatch
									const url = resolve(generatedUrl) + '?prId=' + encodeURIComponent(row.id);
									window.location.href = url;
								}}
							>
								<LucideCircleCheck className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					{/if}

					{#if prRowCanCancel(row)}
						<DaisyUiTooltip
							tooltipText={m.inv_pr_cancel()}
							className="d-tooltip-error d-tooltip-right"
						>
							<DaisyUiButton
								className="d-btn-ghost d-btn-sm d-btn-error"
								onClick={() => openCancelDialog(row)}
							>
								<LucideBan className="size-5" />
							</DaisyUiButton>
						</DaisyUiTooltip>
					{/if}
				</div>
				{/snippet}
			</MariTable>
		{/key}
	</div>

	<PrCancelModal
		open={cancelDialogOpen}
		bind:cancelReason={cancelReasonDraft}
		submitting={cancelSubmitting}
		onClose={closeCancelDialog}
		onConfirm={() => void submitCancelPr()}
	/>
{:else}
	<form
		onsubmit={(e) => {
			e.preventDefault();
			void submitPrForm();
		}}
		class="space-y-5"
	>
		<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0">
				<div class="text-xs opacity-70">{m.inv_page_pr_title()}</div>
				<h2 class="text-lg font-semibold">
					{viewMode === 'edit'
						? m.inv_pr_edit_title()
						: viewMode === 'view'
							? `View purchase requisition`
							: m.inv_pr_new_title()}
				</h2>
			</div>

			<div class="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
				<span
					class="d-badge d-badge-outline"
					title={headerStatusCode ?? undefined}
					aria-label={`Status: ${headerStatusLabel}`}
				>
					{headerStatusLabel}
				</span>
				{#if headerPrNo}
					<span class="d-badge d-badge-ghost" aria-label={`PR No: ${headerPrNo}`}>
						{m.inv_pr_no()}: {headerPrNo}
					</span>
				{:else}
					<span class="d-badge d-badge-ghost" aria-label="PR No: pending">PR No: —</span>
				{/if}
				<DaisyUiButton
					type="button"
					className="d-btn-sm d-btn-ghost d-btn-outline"
					onClick={() => {
						editPrId = null;
						viewMode = 'list';
					}}
				>
					{m.inv_common_back_to_list()}
				</DaisyUiButton>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<DaisyUiCard>
				<DaisyUiCardBody className="gap-3">
					<DaisyUiCardBodyTitle className="text-base">Store Selection</DaisyUiCardBodyTitle>
					<div class="flex min-w-0 flex-col gap-2">
						<DaisyUiLabel className="text-xs opacity-80">{m.inv_common_store()}</DaisyUiLabel>
						<DaisyUISearchSelect
							value={createStoreId != null ? String(createStoreId) : ''}
							options={stores.map((s) => ({
								label: s.storeName ?? '—',
								value: String(s.id)
							}))}
							onChange={(v: string) => {
								createStoreId = v ? Number(v) : null;
							}}
							placeholder="Select store..."
							className="w-full"
							disabled={viewMode === 'edit' || viewMode === 'view'}
						/>
					</div>
				</DaisyUiCardBody>
			</DaisyUiCard>

			<DaisyUiCard>
				<DaisyUiCardBody className="gap-3">
					<DaisyUiCardBodyTitle className="text-base">Requisition Remarks</DaisyUiCardBodyTitle>
					<div class="flex min-w-0 flex-col gap-2">
						<DaisyUiLabel className="text-xs opacity-80">{m.inv_common_remarks()}</DaisyUiLabel>
						<textarea
							class="d-textarea d-textarea-bordered w-full"
							bind:value={createRemarks}
							rows="3"
							disabled={viewMode === 'view'}
							aria-label={m.inv_common_remarks()}
						></textarea>
					</div>
				</DaisyUiCardBody>
			</DaisyUiCard>
		</div>

		<PrLineItemsCard
			viewOnly={viewMode === 'view'}
			bind:lineItemFilter
			createLinesCount={createLines.length}
			columns={lineColumns}
			rows={filteredLines}
			onAddItem={openLineDialogForCreate}
			onEditLine={openLineDialogForEdit}
			onDeleteLine={deleteLine}
		/>

		<div class="flex flex-col-reverse gap-2 border-t border-base-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
			{#if viewMode !== 'view'}
				<DaisyUiButton
					type="submit"
					className="d-btn-primary"
					disabled={createSubmitting}
				>
					{viewMode === 'edit' ? m.inv_pr_save_submit() : m.inv_pr_create_submit()}
				</DaisyUiButton>
			{/if}
		</div>
	</form>

	<PrLineItemModal
		open={lineDialogOpen}
		title={editingLineKey ? 'Edit line item' : 'Add line item'}
		submitting={lineDialogSubmitting}
		bind:draftLine
		searchItemsFn={searchItemsForPrLine}
		onPickItem={pickDraftItem}
		onClose={closeLineDialog}
		onSave={saveDraftLine}
	/>
{/if}

