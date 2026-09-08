<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import PrLineItemsCard from '$lib/component/own/local/private/medora/inventory/purchase-requisition/PrLineItemsCard.svelte';
	import PrLineItemDialogContent from '$lib/component/own/local/private/medora/inventory/purchase-requisition/PrLineItemDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { m } from '$lib/paraglide/messages';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { InvPrStatusTaggingEnum } from '$lib/model/enum/db-link';
	import type { PrLineMetricsResponse } from '$lib/model/type/medora/pr-line-metrics.type';
	import {
		tilesFromPrItemMetricsRow,
		type LineItemMetricTile
	} from '$lib/tool/inventory/line-item-metric-tiles.util';
	import { formatPurchaseQtyCellWithIssueEquivalent } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	const editPrId = $derived(
		typeof page.params.pr_id === 'string' ? page.params.pr_id : ''
	);

	const toastService = new ToastService();

	type IumOpt = {
		id: number;
		conversionDisplay: string;
		purchaseUnitId: number;
		issueUnitId: number;
		purchaseConversionFactor?: string;
		issueConversionFactor?: string;
		issueUnitName?: string;
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
		prLineId?: string | null;
		qtyRemainingOnPr?: string | null;
		pendingPrPurchaseQty?: string | null;
		pendingPoPurchaseQty?: string | null;
	};

	type PrDetailApi = {
		id?: string;
		prNo?: string | null;
		statusName?: string | null;
		statusCode?: string | null;
		statusTaggingId?: number;
		fromStoreId: number;
		toStoreId: number;
		remarks: string | null;
		poCount?: number;
		linkedPurchaseOrders?: { id: string; poNo: string | null }[];
		lines: {
			id: number;
			itemId: number;
			quantity: string;
			unitId: number;
			qtyRemaining?: string | null;
			itemName?: string | null;
			pendingPrPurchaseQty?: string | null;
			pendingPoPurchaseQty?: string | null;
		}[];
	};

	let stores = $state<{ id: number; storeName: string | null }[]>([]);
	let createFromStoreId = $state<number | null>(null);
	let createToStoreId = $state<number | null>(null);
	let createRemarks = $state('');
	let createLines = $state<PrLineForm[]>([]);
	let createSubmitting = $state(false);

	const toStoreOptions = $derived.by(() => {
		const from = createFromStoreId;
		if (from == null) return stores;
		return stores.filter((s) => s.id !== from);
	});

	const fromStoreLabel = $derived.by(() => {
		const id = createFromStoreId;
		if (id == null) return '—';
		const match = stores.find((s) => s.id === id);
		return match?.storeName?.trim() ? match.storeName.trim() : '—';
	});

	let headerPrNo = $state<string | null>(null);
	let headerStatusLabel = $state<string>('—');
	let headerStatusCode = $state<string | null>(null);
	let detailStatusTaggingId = $state<number | null>(null);

	let lineItemDialogActive = $state(false);
	let editingLineKey = $state<string | null>(null);
	let draftLine = $state<PrLineForm>(newLine());
	let prLineMetricTiles = $state<LineItemMetricTile[] | null>(null);

	let linkedPurchaseOrders = $state<
		{ id: string; poNo: string | null }[]
	>([]);
	let prDetailPoCount = $state(0);

	let detailLoading = $state(true);

	let storesAbort: AbortController | null = null;
	let lastLoadedKey = $state<string | null>(null);

	const prListPath = $derived(
		medoraHospitalPageUrl(
			hospitalId,
			'/medora/home/inventory/purchase-requisition' as any
		)
	);

	function prViewPath(prIdVal: string) {
		return `/medora/hospital/${hospitalId}/home/inventory/purchase-requisition/${encodeURIComponent(prIdVal)}`;
	}

	function prRowCanEdit(statusTaggingId: number | null): boolean {
		if (statusTaggingId == null) return false;
		return (
			statusTaggingId === InvPrStatusTaggingEnum.DRAFT ||
			statusTaggingId === InvPrStatusTaggingEnum.PENDING ||
			statusTaggingId === InvPrStatusTaggingEnum.SENT_BACK ||
			statusTaggingId === InvPrStatusTaggingEnum.REJECTED
		);
	}

	async function searchItemsForPrLine(q: string) {
		const qEnc = encodeURIComponent(q.trim());
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?name=${qEnc}&pageSize=${AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT}`
		);
		const j = await res.json();
		return (j.data ?? []).map(
			(x: { itemName?: string | null; id: number }) => ({
				label: x.itemName ?? '—',
				value: String(x.id)
			})
		);
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
		const ium = line.iumList.find(
			(u) => u.id === line.itemUnitMasterId
		);
		return ium?.conversionDisplay ?? '—';
	}

	async function openLineDialogForCreate() {
		editingLineKey = null;
		draftLine = newLine();
		lineItemDialogActive = true;
		try {
			await dialogService.open({
				title: m.inv_line_modal_title_add(),
				modalClassName: 'max-w-2xl',
				component: PrLineItemDialogContent,
				props: {
					draftLine,
					stockEnrichment: prLineItemStockEnrichment,
					searchItemsFn: searchItemsForPrLine,
					onPickItem: pickDraftItem,
					onSaveAttempt: saveDraftLine,
					lineItemMetricTiles: prLineMetricTiles
				}
			});
		} finally {
			lineItemDialogActive = false;
			editingLineKey = null;
		}
	}

	async function openLineDialogForEdit(line: PrLineForm) {
		editingLineKey = line.key;
		draftLine = {
			...line,
			hits: [...line.hits],
			iumList: [...line.iumList]
		};
		lineItemDialogActive = true;
		try {
			await dialogService.open({
				title: m.inv_line_modal_title_edit(),
				modalClassName: 'max-w-2xl',
				component: PrLineItemDialogContent,
				props: {
					draftLine,
					stockEnrichment: prLineItemStockEnrichment,
					searchItemsFn: searchItemsForPrLine,
					onPickItem: pickDraftItem,
					onSaveAttempt: saveDraftLine,
					lineItemMetricTiles: prLineMetricTiles
				}
			});
		} finally {
			lineItemDialogActive = false;
			editingLineKey = null;
		}
	}

	async function pickDraftItem(itemId: number) {
		await hydrateLineItemMeta(draftLine, itemId);
		// Keep the same `draftLine` object reference while the dialog is open.
	}

	function validateDraftLine():
		| { ok: true; quantity: string; unitId: number; itemId: number }
		| { ok: false; title: string; detail: string } {
		const unitId = purchaseUnitForLine(draftLine);
		if (draftLine.itemId == null || unitId == null) {
			return {
				ok: false,
				title: 'Could not save line',
				detail:
					'Please select an item and a purchase unit conversion.'
			};
		}
		const q = String(draftLine.quantity ?? '').trim();
		if (!q || !Number.isFinite(Number(q)) || Number(q) <= 0) {
			return {
				ok: false,
				title: 'Could not save line',
				detail: 'Quantity must be greater than 0.'
			};
		}
		return {
			ok: true,
			quantity: q,
			unitId,
			itemId: draftLine.itemId
		};
	}

	function saveDraftLine(): boolean {
		const v = validateDraftLine();
		if (!v.ok) {
			toastService.addToast(v.title, StatusColorEnum.ERROR, v.detail);
			return false;
		}

		if (editingLineKey) {
			const idx = createLines.findIndex(
				(l) => l.key === editingLineKey
			);
			if (idx >= 0) {
				const next = [...createLines];
				next[idx] = { ...draftLine, quantity: v.quantity };
				createLines = next;
			}
		} else {
			createLines = [
				...createLines,
				{ ...draftLine, quantity: v.quantity }
			];
		}
		return true;
	}

	function deleteLine(lineKey: string) {
		createLines = createLines.filter((l) => l.key !== lineKey);
	}

	async function refreshPrLineMetrics() {
		if (!hospitalId || !lineItemDialogActive || !editPrId) return;
		const unitId = purchaseUnitForLine(draftLine);
		if (
			createFromStoreId == null ||
			draftLine.itemId == null ||
			unitId == null
		) {
			prLineMetricTiles = null;
			return;
		}
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory/purchase-requisition/item-metrics`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fromStoreId: createFromStoreId,
					prId: editPrId,
					lines: [{ itemId: draftLine.itemId, unitId }]
				})
			}
		);
		if (!res.ok) {
			prLineMetricTiles = null;
			return;
		}
		const j = (await res.json()) as PrLineMetricsResponse;
		const row = j.rows[0];
		if (!row) {
			prLineMetricTiles = null;
			return;
		}
		prLineMetricTiles = tilesFromPrItemMetricsRow(
			row,
			row.currentPrPurchaseQty,
			{
				store: m.inv_pr_line_metric_store(),
				global: m.inv_pr_line_metric_global(),
				pendingPr: m.inv_pr_line_metric_pending_pr_qty(),
				pendingPo: m.inv_po_line_metric_pending_po_qty(),
				current: m.inv_pr_line_metric_current()
			}
		);
	}

	$effect(() => {
		if (!lineItemDialogActive) {
			prLineMetricTiles = null;
			return;
		}
		void draftLine.itemId;
		void draftLine.itemUnitMasterId;
		void draftLine.quantity;
		void createFromStoreId;
		void createLines;
		void editingLineKey;
		void hospitalId;
		void editPrId;
		void refreshPrLineMetrics();
	});

	async function loadStores() {
		if (!hospitalId) return;
		storesAbort?.abort();
		storesAbort = new AbortController();
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory-setup/stores?mode=allForPicker`,
			{ method: 'GET', signal: storesAbort.signal }
		);
		stores = (await res.json()) as typeof stores;
	}

	async function hydrateLineItemMeta(
		line: PrLineForm,
		itemId: number
	) {
		if (!hospitalId) return;
		line.itemId = itemId;
		const [detailRes, iumRes] = await Promise.all([
			fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?id=${itemId}`,
				{ method: 'GET' }
			),
			fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?mode=itemUnitMasters`,
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

	async function hydrateLineFromPrDetail(
		line: PrLineForm,
		apiLine: PrDetailApi['lines'][number]
	) {
		line.quantity = String(apiLine.quantity ?? '0');
		line.prLineId = apiLine.id != null ? String(apiLine.id) : null;
		line.qtyRemainingOnPr =
			apiLine.qtyRemaining != null &&
			String(apiLine.qtyRemaining).trim() !== ''
				? String(apiLine.qtyRemaining)
				: null;
		await hydrateLineItemMeta(line, apiLine.itemId);
		if (apiLine.itemName) {
			line.itemLabel = apiLine.itemName;
			line.itemSearch = apiLine.itemName;
		}
		const match = line.iumList.find(
			(u) => u.purchaseUnitId === apiLine.unitId
		);
		if (match) line.itemUnitMasterId = match.id;
		line.pendingPrPurchaseQty =
			apiLine.pendingPrPurchaseQty != null &&
			String(apiLine.pendingPrPurchaseQty).trim() !== ''
				? String(apiLine.pendingPrPurchaseQty).trim()
				: null;
		line.pendingPoPurchaseQty =
			apiLine.pendingPoPurchaseQty != null &&
			String(apiLine.pendingPoPurchaseQty).trim() !== ''
				? String(apiLine.pendingPoPurchaseQty).trim()
				: null;
	}

	async function populateFromDetail(detail: PrDetailApi) {
		headerPrNo = detail.prNo ?? null;
		headerStatusLabel = detail.statusName ?? detail.statusCode ?? '—';
		headerStatusCode = detail.statusCode ?? null;
		detailStatusTaggingId = detail.statusTaggingId ?? null;
		createFromStoreId = detail.fromStoreId;
		createToStoreId = detail.toStoreId;
		createRemarks = detail.remarks ?? '';
		linkedPurchaseOrders = detail.linkedPurchaseOrders ?? [];
		prDetailPoCount = detail.poCount ?? 0;
		const nextLines: PrLineForm[] = [];
		for (const l of detail.lines ?? []) {
			const line = newLine();
			await hydrateLineFromPrDetail(line, l);
			nextLines.push(line);
		}
		createLines = nextLines;
	}

	function purchaseUnitForLine(line: PrLineForm): number | null {
		const ium = line.iumList.find(
			(u) => u.id === line.itemUnitMasterId
		);
		return ium?.purchaseUnitId ?? null;
	}

	function buildLinesPayload():
		| {
				ok: true;
				lines: { itemId: number; quantity: string; unitId: number }[];
		  }
		| { ok: false; title: string; detail: string } {
		const linesPayload: {
			itemId: number;
			quantity: string;
			unitId: number;
		}[] = [];
		for (const ln of createLines) {
			const uid = purchaseUnitForLine(ln);
			if (ln.itemId == null || uid == null) {
				return {
					ok: false,
					title: 'Could not save PR',
					detail: 'Each line needs an item and unit conversion.'
				};
			}
			const q = String(ln.quantity ?? '').trim();
			if (!q || !Number.isFinite(Number(q)) || Number(q) <= 0) {
				return {
					ok: false,
					title: 'Could not save PR',
					detail: 'Invalid quantity on a line.'
				};
			}
			linesPayload.push({
				itemId: ln.itemId,
				quantity: q,
				unitId: uid
			});
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

	async function loadPrForEdit() {
		if (!hospitalId || !editPrId) return;
		detailLoading = true;
		try {
			await loadStores();
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/purchase-requisition?id=${encodeURIComponent(editPrId)}`,
				{ method: 'GET' }
			);
			if (!res.ok) {
				toastService.addToast(
					m.inv_pr_edit(),
					StatusColorEnum.ERROR,
					await res.text().catch(() => String(res.status))
				);
				await goto(resolve(prListPath as any));
				return;
			}
			const detail = (await res.json()) as PrDetailApi | null;
			if (!detail) {
				await goto(resolve(prListPath as any));
				return;
			}
			if (!detail.lines?.length) {
				toastService.addToast(
					m.inv_pr_edit(),
					StatusColorEnum.ERROR,
					'PR has no lines.'
				);
				await goto(prViewPath(editPrId));
				return;
			}
			await populateFromDetail(detail);
			if (!prRowCanEdit(detailStatusTaggingId)) {
				toastService.addToast(
					m.inv_pr_edit(),
					StatusColorEnum.ERROR,
					'PR cannot be edited in current status.'
				);
				await goto(prViewPath(editPrId));
			}
		} catch (e) {
			toastService.addErrorToast(m.inv_pr_edit(), e);
			await goto(resolve(prListPath as any));
		} finally {
			detailLoading = false;
		}
	}

	$effect(() => {
		const key =
			hospitalId && editPrId ? `${hospitalId}:${editPrId}` : '';
		if (!key) return;
		if (lastLoadedKey === key) return;
		lastLoadedKey = key;
		void loadPrForEdit();
	});

	$effect(() => {
		void createFromStoreId;
		void stores;
		const from = createFromStoreId;
		const opts =
			from == null ? stores : stores.filter((s) => s.id !== from);
		if (
			createToStoreId != null &&
			(createToStoreId === from ||
				!opts.some((s) => s.id === createToStoreId))
		) {
			createToStoreId = opts[0]?.id ?? null;
		}
	});

	async function submitPrForm() {
		if (
			!hospitalId ||
			!editPrId ||
			createFromStoreId == null ||
			createToStoreId == null
		) {
			return;
		}
		const built = buildLinesPayload();
		if (!built.ok) {
			toastService.addToast(
				built.title,
				StatusColorEnum.ERROR,
				built.detail
			);
			return;
		}
		createSubmitting = true;
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/purchase-requisition`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: editPrId,
						fromStoreId: createFromStoreId,
						toStoreId: createToStoreId,
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
			await goto(prViewPath(editPrId));
		} finally {
			createSubmitting = false;
		}
	}

	const prLineItemStockEnrichment = $derived(
		hospitalId && createFromStoreId != null
			? {
					hospitalId,
					selectedStoreId: createFromStoreId,
					toStoreId: createToStoreId
				}
			: null
	);

	const lineColumns = $derived.by(
		(): MenziesTableColumn<PrLineForm>[] => [
			{
				id: 'itemLabel',
				header: m.inv_common_item(),
				field: 'itemLabel',
				filterable: true,
				format: (_v, row) => row.itemLabel || '—'
			},
			{
				id: 'conversion',
				header: m.inv_common_unit(),
				field: 'itemUnitMasterId',
				filterable: true,
				format: (_v, row) => conversionLabelForLine(row)
			},
			{
				id: 'quantity',
				header: m.inv_pr_line_requested_qty(),
				field: 'quantity',
				filterable: true,
				format: (_v, row) =>
					formatPurchaseQtyCellWithIssueEquivalent(row)
			},
			{
				id: 'pendingPrPurchaseQty',
				header: m.inv_pr_line_metric_pending_pr_qty(),
				field: 'pendingPrPurchaseQty',
				filterable: true,
				widthClass: 'min-w-[7rem]',
				format: (_v, row) => {
					const raw = row.pendingPrPurchaseQty?.trim();
					if (!raw) return '—';
					return formatPurchaseQtyCellWithIssueEquivalent({
						quantity: raw,
						itemUnitMasterId: row.itemUnitMasterId,
						iumList: row.iumList
					});
				}
			},
			{
				id: 'pendingPoPurchaseQty',
				header: m.inv_po_line_metric_pending_po_qty(),
				field: 'pendingPoPurchaseQty',
				filterable: true,
				widthClass: 'min-w-[7rem]',
				format: (_v, row) => {
					const raw = row.pendingPoPurchaseQty?.trim();
					if (!raw) return '—';
					return formatPurchaseQtyCellWithIssueEquivalent({
						quantity: raw,
						itemUnitMasterId: row.itemUnitMasterId,
						iumList: row.iumList
					});
				}
			},
			{
				id: 'qtyRemainingOnPr',
				header: m.inv_pr_line_open_for_po(),
				field: 'qtyRemainingOnPr',
				filterable: true,
				widthClass: 'min-w-[7rem]',
				format: (_v, row) => {
					const raw = row.qtyRemainingOnPr?.trim();
					if (!raw) return '—';
					return formatPurchaseQtyCellWithIssueEquivalent({
						quantity: raw,
						itemUnitMasterId: row.itemUnitMasterId,
						iumList: row.iumList
					});
				}
			}
		]
	);
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		void submitPrForm();
	}}
	class="space-y-5"
	aria-busy={detailLoading}
>
	<div
		class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
	>
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<WashTooltip
					tooltipText={m.inv_common_back_to_list()}
					className="tooltip-ghost"
				>
					<WashButton
						type="button"
						className="btn-sm btn-ghost btn-square"
						disabled={detailLoading}
						onClick={() => void goto(prViewPath(editPrId))}
					>
						<LucideArrowLeft className="size-4" />
					</WashButton>
				</WashTooltip>
				<h2 class="text-lg font-semibold">{m.inv_pr_edit_title()}</h2>
				{#if detailLoading}
					<span
						class="loading loading-sm loading-spinner text-base-content/50"
					></span>
				{/if}
			</div>
		</div>

		<div
			class="flex flex-wrap items-center justify-start gap-2 sm:justify-end"
		>
			<span
				class="badge badge-outline"
				title={headerStatusCode ?? undefined}
				aria-label={`Status: ${headerStatusLabel}`}
			>
				{headerStatusLabel}
			</span>
			{#if headerPrNo}
				<span
					class="badge badge-ghost"
					aria-label={`PR No: ${headerPrNo}`}
				>
					{m.inv_pr_no()}: {headerPrNo}
				</span>
			{:else}
				<span class="badge badge-ghost" aria-label="PR No"
					>PR No: —</span
				>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<WashCard>
			<WashCardBody className="gap-3">
				<WashCardBodyTitle className="text-base"
					>Store selection</WashCardBodyTitle
				>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div class="flex min-w-0 flex-col gap-2">
						<label class="text-xs opacity-80">{m.inv_nav_from_store()}</label>
						<input
							type="text"
							readonly
							disabled
							class="input-bordered input w-full text-sm"
							value={fromStoreLabel}
							aria-label={m.inv_nav_from_store()}
						/>
					</div>
					<div class="flex min-w-0 flex-col gap-2">
						<label class="text-xs opacity-80">{m.inv_transfer_to_store()}</label>
						<SearchSelect
							value={createToStoreId != null
								? String(createToStoreId)
								: ''}
							options={toStoreOptions.map((s) => ({
								label: s.storeName ?? '—',
								value: String(s.id)
							}))}
							onChange={(v: string) => {
								createToStoreId = v ? Number(v) : null;
							}}
							placeholder="To store…"
							className="w-full"
						/>
					</div>
				</div>
			</WashCardBody>
		</WashCard>

		<WashCard>
			<WashCardBody className="gap-3">
				<WashCardBodyTitle className="text-base"
					>Requisition Remarks</WashCardBodyTitle
				>
				<div class="flex min-w-0 flex-col gap-2">
					<label class="text-xs opacity-80">{m.inv_common_remarks()}</label>
					<textarea
						class="textarea-bordered textarea w-full"
						bind:value={createRemarks}
						rows="3"
						aria-label={m.inv_common_remarks()}
					></textarea>
				</div>
			</WashCardBody>
		</WashCard>
	</div>

	{#if linkedPurchaseOrders.length > 0 || (prDetailPoCount ?? 0) > 0}
		<WashCard>
			<WashCardBody className="gap-3">
				<WashCardBodyTitle className="text-base"
					>{m.inv_pr_trace_title()}</WashCardBodyTitle
				>
				{#if linkedPurchaseOrders.length > 0}
					<ul class="flex flex-wrap gap-2">
						{#each linkedPurchaseOrders as po (po.id)}
							<li>
								<span
									class="link text-sm font-medium link-primary"
								>
									{po.poNo?.trim() ? po.poNo : po.id}
								</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-warning">
						{m.inv_pr_trace_po_mismatch()}
					</p>
				{/if}
			</WashCardBody>
		</WashCard>
	{/if}

	<PrLineItemsCard
		viewOnly={false}
		useColumnFilters={true}
		hideQuickFilter={true}
		createLinesCount={createLines.length}
		columns={lineColumns}
		rows={createLines}
		onAddItem={() => {
			if (detailLoading) return;
			void openLineDialogForCreate();
		}}
		onEditLine={(row) => {
			if (detailLoading) return;
			void openLineDialogForEdit(row);
		}}
		onDeleteLine={(key) => {
			if (detailLoading) return;
			deleteLine(key);
		}}
	/>

	<div
		class="flex flex-col-reverse gap-2 border-t border-base-200 pt-4 sm:flex-row sm:items-center sm:justify-end"
	>
		<WashButton
			type="submit"
			className="btn-primary"
			disabled={detailLoading || createSubmitting}
		>
			{m.inv_pr_save_submit()}
		</WashButton>
	</div>
</form>
