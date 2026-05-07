<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import PrLineItemsCard from '$lib/component/own/local/private/heka/inventory/purchase-requisition/PrLineItemsCard.svelte';
	import PrLineItemDialogContent from '$lib/component/own/local/private/heka/inventory/purchase-requisition/PrLineItemDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { m } from '$lib/paraglide/messages';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { PrLineMetricsResponse } from '$lib/model/type/heka/pr-line-metrics.type';
	import {
		tilesFromPrItemMetricsRow,
		type LineItemMetricTile
	} from '$lib/tool/inventory/line-item-metric-tiles.util';
	import { formatPurchaseQtyCellWithIssueEquivalent } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	let { data: layoutData } = $props();
	const selectedInventoryFromStoreId = $derived(
		(layoutData as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
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
	};

	let stores = $state<{ id: number; storeName: string | null }[]>([]);
	let createFromStoreId = $state<number | null>(null);
	let createToStoreId = $state<number | null>(null);
	let createRemarks = $state('');
	let createLines = $state<PrLineForm[]>([]);
	let createSubmitting = $state(false);

	let headerPrNo = $state<string | null>(null);
	let headerStatusLabel = $state<string>('Draft');
	let headerStatusCode = $state<string | null>(null);

	let lineItemFilter = $state('');

	let lineItemDialogActive = $state(false);
	let editingLineKey = $state<string | null>(null);
	let draftLine = $state<PrLineForm>(newLine());
	let prLineMetricTiles = $state<LineItemMetricTile[] | null>(null);

	let storesAbort: AbortController | null = null;
	let lastInitHospitalId = $state<string | null>(null);

	const fromStoreNavLabel = $derived.by(() => {
		const id = createFromStoreId;
		if (id == null) return '—';
		const match = stores.find((s) => s.id === id);
		if (match?.storeName?.trim()) return match.storeName.trim();
		return '—';
	});

	const prListPath = $derived(
		hekaHospitalPageUrl(hospitalId, '/heka/home/inventory/purchase-requisition' as any)
	);

	async function goBackToList() {
		await goto(resolve(prListPath as any));
	}

	async function searchItemsForPrLine(q: string) {
		const qEnc = encodeURIComponent(q.trim());
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?name=${qEnc}&pageSize=${AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT}`
		);
		const j = await res.json();
		return (j.data ?? []).map((x: { itemName?: string | null; id: number }) => ({
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

	function saveDraftLine(): boolean {
		const v = validateDraftLine();
		if (!v.ok) {
			toastService.addToast(v.title, StatusColorEnum.ERROR, v.detail);
			return false;
		}

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
		return true;
	}

	function deleteLine(lineKey: string) {
		createLines = createLines.filter((l) => l.key !== lineKey);
	}

	function sumCurrentDraftForLine(itemId: number, unitId: number): string {
		let s = 0;
		for (const l of createLines) {
			if (editingLineKey && l.key === editingLineKey) continue;
			const u = purchaseUnitForLine(l);
			if (l.itemId === itemId && u === unitId) s += Number(l.quantity) || 0;
		}
		if (
			draftLine.itemId === itemId &&
			purchaseUnitForLine(draftLine) === unitId
		) {
			s += Number(draftLine.quantity) || 0;
		}
		return String(s);
	}

	async function refreshPrLineMetrics() {
		if (!hospitalId || !lineItemDialogActive) return;
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
			`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition/item-metrics`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fromStoreId: createFromStoreId,
					prId: null,
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
		const current = sumCurrentDraftForLine(draftLine.itemId, unitId);
		prLineMetricTiles = tilesFromPrItemMetricsRow(row, current, {
			store: m.inv_pr_line_metric_store(),
			global: m.inv_pr_line_metric_global(),
			pendingPr: m.inv_pr_line_metric_pending_pr_qty(),
			pendingPo: m.inv_po_line_metric_pending_po_qty(),
			current: m.inv_pr_line_metric_current()
		});
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
		void refreshPrLineMetrics();
	});

	async function loadStores() {
		if (!hospitalId) return;
		storesAbort?.abort();
		storesAbort = new AbortController();
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/approval-config?mode=stores`,
			{ method: 'GET', signal: storesAbort.signal }
		);
		stores = (await res.json()) as typeof stores;
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
		if (!hospitalId || createFromStoreId == null || createToStoreId == null) {
			return;
		}
		const built = buildLinesPayload();
		if (!built.ok) {
			toastService.addToast(built.title, StatusColorEnum.ERROR, built.detail);
			return;
		}
		createSubmitting = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
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
					'Could not create PR',
					StatusColorEnum.ERROR,
					text || res.statusText
				);
				return;
			}
			const created = (await res.json()) as { id?: string };
			const id = created?.id?.trim();
			if (id) {
				await goto(
					`/heka/hospital/${hospitalId}/home/inventory/purchase-requisition/${encodeURIComponent(id)}`
				);
				return;
			}
			await goBackToList();
		} finally {
			createSubmitting = false;
		}
	}

	$effect(() => {
		const h = hospitalId;
		if (!h) return;
		if (lastInitHospitalId === h) return;
		lastInitHospitalId = h;
		void loadStores().then(() => {
			createFromStoreId = selectedInventoryFromStoreId ?? stores[0]?.id ?? null;
			if (createToStoreId == null && stores.length >= 1) {
				const pick = stores.find((s) => s.id !== createFromStoreId);
				createToStoreId =
					pick?.id ?? (stores.length > 1 ? stores[1]!.id : null);
			}
		});
	});

	$effect(() => {
		if (selectedInventoryFromStoreId != null) {
			createFromStoreId = selectedInventoryFromStoreId;
		}
	});

	const prLineItemStockEnrichment = $derived(
		hospitalId && createFromStoreId != null
			? {
					hospitalId,
					selectedStoreId: createFromStoreId,
					toStoreId: createToStoreId
				}
			: null
	);

	const lineColumns = $derived.by((): MariTableColumn<PrLineForm>[] => [
		{
			id: 'itemLabel',
			header: m.inv_common_item(),
			field: 'itemLabel',
			filterable: false,
			format: (_v, row) => row.itemLabel || '—'
		},
		{
			id: 'conversion',
			header: m.inv_common_unit(),
			field: 'itemUnitMasterId',
			filterable: false,
			format: (_v, row) => conversionLabelForLine(row)
		},
		{
			id: 'quantity',
			header: m.inv_common_quantity(),
			field: 'quantity',
			filterable: false,
			format: (_v, row) => formatPurchaseQtyCellWithIssueEquivalent(row)
		}
	]);

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

<form
	onsubmit={(e) => {
		e.preventDefault();
		void submitPrForm();
	}}
	class="space-y-5"
>
	<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<div class="flex items-center gap-2">
				<DaisyUiTooltip
					tooltipText={m.inv_common_back_to_list()}
					className="d-tooltip-ghost d-tooltip-right"
				>
					<DaisyUiButton
						type="button"
						className="d-btn-sm d-btn-ghost d-btn-square"
						onClick={() => void goBackToList()}
					>
						<LucideArrowLeft className="size-4" />
					</DaisyUiButton>
				</DaisyUiTooltip>
				<h2 class="text-lg font-semibold">{m.inv_pr_new_title()}</h2>
			</div>
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
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<DaisyUiCard>
			<DaisyUiCardBody className="gap-3">
				<DaisyUiCardBodyTitle className="text-base">Store selection</DaisyUiCardBodyTitle>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div class="flex min-w-0 flex-col gap-2">
						<DaisyUiLabel className="text-xs opacity-80">{m.inv_nav_from_store()}</DaisyUiLabel>
						<input
							type="text"
							readonly
							disabled
							class="d-input d-input-bordered w-full text-sm"
							value={fromStoreNavLabel}
							aria-label={m.inv_nav_from_store()}
						/>
						{#if createFromStoreId == null}
							<div class="mt-2 d-alert d-alert-warning text-sm" role="status">
								{m.inv_inventory_from_store_topbar_hint()}
							</div>
						{/if}
					</div>
					<div class="flex min-w-0 flex-col gap-2">
						<DaisyUiLabel className="text-xs opacity-80">{m.inv_transfer_to_store()}</DaisyUiLabel>
						<DaisyUISearchSelect
							value={createToStoreId != null ? String(createToStoreId) : ''}
							options={stores.map((s) => ({
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
						aria-label={m.inv_common_remarks()}
					></textarea>
				</div>
			</DaisyUiCardBody>
		</DaisyUiCard>
	</div>

	<PrLineItemsCard
		viewOnly={false}
		bind:lineItemFilter
		createLinesCount={createLines.length}
		columns={lineColumns}
		rows={filteredLines}
		onAddItem={() => void openLineDialogForCreate()}
		onEditLine={(line) => void openLineDialogForEdit(line)}
		onDeleteLine={deleteLine}
	/>

	<div
		class="flex flex-col-reverse gap-2 border-t border-base-200 pt-4 sm:flex-row sm:items-center sm:justify-end"
	>
		<DaisyUiButton type="submit" className="d-btn-primary" disabled={createSubmitting}>
			{m.inv_pr_create_submit()}
		</DaisyUiButton>
	</div>
</form>
