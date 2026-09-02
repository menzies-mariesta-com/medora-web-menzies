<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import PrLineItemsCard from '$lib/component/own/local/private/heka/inventory/purchase-requisition/PrLineItemsCard.svelte';
	import PrLineItemDialogContent from '$lib/component/own/local/private/heka/inventory/purchase-requisition/PrLineItemDialogContent.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import type { MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import type { LineItemMetricTile } from '$lib/tool/inventory/line-item-metric-tiles.util';
	import { fetchStockLabelsForItemsAtStore } from '$lib/tool/inventory/fetch-stock-on-hand-for-items.util';
	import { formatPurchaseQtyCellWithIssueEquivalent } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	const lifeCycle = new LifeCycleUtil();
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

	type StoreRow = {
		id: number;
		storeName: string | null;
		branchId: string | null;
	};
	let stores = $state<StoreRow[]>([]);

	let toStoreIdStr = $state('');
	let remarks = $state('');

	let submitting = $state(false);

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
		// These are only used by the shared PR line UX components.
		itemSearch: string;
		hits: { id: number; itemName: string | null }[];
		itemId: number | null;
		itemLabel: string;
		quantity: string;
		iumList: IumOpt[];
		itemUnitMasterId: number | null;
	};

	let createLines = $state<PrLineForm[]>([]);

	let lineItemDialogActive = $state(false);
	let editingLineKey = $state<string | null>(null);
	let draftLine = $state<PrLineForm>(newLine());
	let lineDialogMetricTiles = $state<LineItemMetricTile[] | null>(
		null
	);

	const diLineItemStockEnrichment = $derived(
		hospitalId
			? {
					hospitalId,
					selectedStoreId: selectedInventoryFromStoreId,
					toStoreId:
						toStoreIdStr !== '' &&
						Number.isFinite(Number(toStoreIdStr))
							? Number(toStoreIdStr)
							: null
				}
			: null
	);

	const diListPath = $derived(
		hekaHospitalPageUrl(
			hospitalId,
			'/heka/home/inventory/department-indent' as any
		)
	);

	async function goBackToList() {
		await goto(resolve(diListPath as any));
	}

	const toStoreOptions = $derived.by((): StoreRow[] => {
		const fromId = selectedInventoryFromStoreId;
		if (fromId == null) {
			return stores;
		}
		return stores.filter((s) => s.id !== fromId);
	});

	async function loadStores() {
		if (!hospitalId) return;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/stores?mode=allForPicker`
		);
		const raw = (await res.json()) as StoreRow[];
		stores = raw;
	}

	$effect(() => {
		void hospitalId;
		void loadStores();
	});

	lifeCycle.onMount(() => {
		toStoreIdStr = '';
		remarks = '';
		createLines = [];
		lineItemDialogActive = false;
		editingLineKey = null;
		draftLine = newLine();
	});

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
					stockEnrichment: diLineItemStockEnrichment,
					searchItemsFn: searchItemsForPrLine,
					onPickItem: pickDraftItem,
					onSaveAttempt: saveDraftLine,
					lineItemMetricTiles: lineDialogMetricTiles
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
					stockEnrichment: diLineItemStockEnrichment,
					searchItemsFn: searchItemsForPrLine,
					onPickItem: pickDraftItem,
					onSaveAttempt: saveDraftLine,
					lineItemMetricTiles: lineDialogMetricTiles
				}
			});
		} finally {
			lineItemDialogActive = false;
			editingLineKey = null;
		}
	}

	async function searchItemsForPrLine(q: string) {
		if (!hospitalId) return [];
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?name=${encodeURIComponent(q.trim())}&pageSize=${AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT}`
		);
		const j = (await res.json()) as {
			data: { id: number; itemName: string | null }[];
		};
		return (j.data ?? []).map((x) => ({
			label: x.itemName ?? '—',
			value: String(x.id)
		}));
	}

	async function pickDraftItem(itemId: number) {
		await hydrateLineItemMeta(draftLine, itemId);
		// Keep the same `draftLine` object reference while the dialog is open.
		// The dialog system passes props as a snapshot; reassigning would desync what the dialog edits vs what save reads.
	}

	async function hydrateLineItemMeta(
		line: PrLineForm,
		itemId: number
	) {
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

		const allIum = (await iumRes.json()) as IumOpt[];
		const allowed = new Set(detail.itemUnitMasterIds ?? []);
		line.iumList = allIum.filter((u) => allowed.has(u.id));

		line.itemLabel = detail.itemName ?? '—';
		line.itemSearch = line.itemLabel;

		const def = detail.defaultItemUnitMasterId;
		line.itemUnitMasterId =
			def != null && line.iumList.some((u) => u.id === def)
				? def
				: (line.iumList[0]?.id ?? null);
	}

	function purchaseUnitForLine(line: PrLineForm): number | null {
		const ium = line.iumList.find(
			(u) => u.id === line.itemUnitMasterId
		);
		return ium?.purchaseUnitId ?? null;
	}

	function sumCurrentDraftForLine(
		itemId: number,
		unitId: number
	): string {
		let s = 0;
		for (const l of createLines) {
			if (editingLineKey && l.key === editingLineKey) continue;
			const u = purchaseUnitForLine(l);
			if (l.itemId === itemId && u === unitId)
				s += Number(l.quantity) || 0;
		}
		if (
			draftLine.itemId === itemId &&
			purchaseUnitForLine(draftLine) === unitId
		) {
			s += Number(draftLine.quantity) || 0;
		}
		return String(s);
	}

	async function refreshIndentLineDialogMetricTiles() {
		if (!hospitalId || !lineItemDialogActive) {
			lineDialogMetricTiles = null;
			return;
		}
		const itemId = draftLine.itemId;
		const unitId = purchaseUnitForLine(draftLine);
		if (itemId == null || unitId == null) {
			lineDialogMetricTiles = null;
			return;
		}
		const fromS = selectedInventoryFromStoreId;
		const toS =
			toStoreIdStr !== '' && Number.isFinite(Number(toStoreIdStr))
				? Number(toStoreIdStr)
				: null;
		const tiles: LineItemMetricTile[] = [];
		try {
			if (fromS != null && toS != null && fromS === toS) {
				const map = await fetchStockLabelsForItemsAtStore(
					hospitalId,
					fromS,
					[itemId]
				);
				tiles.push({
					label: m.inv_line_modal_on_hand_selected(),
					value: map.get(itemId) ?? '0'
				});
			} else {
				if (fromS != null) {
					const map = await fetchStockLabelsForItemsAtStore(
						hospitalId,
						fromS,
						[itemId]
					);
					tiles.push({
						label: m.inv_line_modal_on_hand_selected(),
						value: map.get(itemId) ?? '0'
					});
				}
				if (toS != null) {
					const map = await fetchStockLabelsForItemsAtStore(
						hospitalId,
						toS,
						[itemId]
					);
					tiles.push({
						label: m.inv_line_modal_on_hand_to(),
						value: map.get(itemId) ?? '0'
					});
				}
			}
			tiles.push({
				label: m.inv_line_modal_metric_line_qty(),
				value: sumCurrentDraftForLine(itemId, unitId),
				convertPurchaseQtyToIssueForDisplay: true
			});
			lineDialogMetricTiles = tiles.length > 0 ? tiles : null;
		} catch {
			lineDialogMetricTiles = null;
		}
	}

	$effect(() => {
		if (!lineItemDialogActive) {
			lineDialogMetricTiles = null;
			return;
		}
		void draftLine.itemId;
		void draftLine.itemUnitMasterId;
		void draftLine.quantity;
		void toStoreIdStr;
		void selectedInventoryFromStoreId;
		void createLines;
		void editingLineKey;
		void hospitalId;
		void refreshIndentLineDialogMetricTiles();
	});

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
			toast.addToast(v.title, StatusColorEnum.ERROR, v.detail);
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
					title: 'Indent',
					detail: 'Each line needs an item and unit conversion.'
				};
			}
			const q = String(ln.quantity ?? '').trim();
			if (!q || !Number.isFinite(Number(q)) || Number(q) <= 0) {
				return {
					ok: false,
					title: 'Indent',
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
				title: 'Indent',
				detail: 'Add at least one line.'
			};
		}
		return { ok: true, lines: linesPayload };
	}

	const lineColumns = $derived.by(
		(): MariTableColumn<PrLineForm>[] => [
			{
				id: 'itemLabel',
				header: m.inv_common_item(),
				field: 'itemLabel',
				filterable: true,
				format: (_v: unknown, row: PrLineForm) => row.itemLabel || '—'
			},
			{
				id: 'conversion',
				header: m.inv_common_unit(),
				field: 'itemUnitMasterId',
				filterable: true,
				format: (_v: unknown, row: PrLineForm) =>
					conversionLabelForLine(row)
			},
			{
				id: 'quantity',
				header: m.inv_common_quantity(),
				field: 'quantity',
				filterable: true,
				format: (_v: unknown, row: PrLineForm) =>
					formatPurchaseQtyCellWithIssueEquivalent(row)
			}
		]
	);

	async function submitCreate() {
		if (!hospitalId) return;
		const from = selectedInventoryFromStoreId;
		const toStoreId =
			toStoreIdStr !== '' ? Number(toStoreIdStr) : null;
		if (from == null || toStoreId == null) {
			toast.addToast(
				'Indent',
				StatusColorEnum.ERROR,
				'From / to store required'
			);
			return;
		}
		const built = buildLinesPayload();
		if (!built.ok) {
			toast.addToast(
				built.title,
				StatusColorEnum.ERROR,
				built.detail
			);
			return;
		}

		const payload = {
			fromStoreId: from,
			toStoreId,
			remarks: remarks.trim() || null,
			lines: built.lines
		};

		submitting = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-indent`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				}
			);
			if (!res.ok) {
				toast.addToast(
					'Indent',
					StatusColorEnum.ERROR,
					await res.text()
				);
				return;
			}
			await goBackToList();
		} finally {
			submitting = false;
		}
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		void submitCreate();
	}}
	class="space-y-4"
>
	<div class="flex items-center gap-2">
		<DaisyUiTooltip
			tooltipText={m.inv_common_back_to_list()}
			className="d-tooltip-ghost d-tooltip-top"
		>
			<DaisyUiButton
				type="button"
				className="d-btn-sm d-btn-ghost d-btn-square"
				onClick={() => void goBackToList()}
			>
				<LucideArrowLeft className="size-4" />
			</DaisyUiButton>
		</DaisyUiTooltip>
		<h1 class="text-lg font-semibold">{m.inv_dept_indent_new()}</h1>
	</div>
	<DaisyUiCard>
		<DaisyUiCardBody className="gap-3">
			<DaisyUiCardBodyTitle className="text-base"
				>{m.inv_common_store()}</DaisyUiCardBodyTitle
			>
			<div
				class="flex flex-col gap-6 sm:flex-row sm:items-stretch md:gap-12 lg:gap-24"
			>
				<div class="min-w-0 flex-1">
					<div class="flex h-full flex-col justify-between gap-3">
						<div>
							<DaisyUiLabel className="text-xs"
								>{m.inv_nav_from_store()}</DaisyUiLabel
							>
							<input
								type="text"
								readonly
								disabled
								class="d-input-bordered d-input mt-1 w-full text-sm"
								value={selectedInventoryFromStoreId != null
									? stores
											.find(
												(s) => s.id === selectedInventoryFromStoreId
											)
											?.storeName?.trim() || '—'
									: '—'}
								aria-label={m.inv_nav_from_store()}
							/>
						</div>
						<div>
							<DaisyUiLabel forText="to-st" className="text-xs"
								>{m.inv_dept_indent_to()}</DaisyUiLabel
							>
							<DaisyUISearchSelect
								inputId="to-st"
								value={toStoreIdStr}
								searchFn={async (q: string) => {
									// Use already-fetched `stores` so this stays client-side and fast.
									const query = q.trim().toLowerCase();
									const base = toStoreOptions.map((s) => ({
										label: s.storeName?.trim()
											? s.storeName.trim()
											: '—',
										value: String(s.id)
									}));
									if (query === '') return base;
									return base.filter((o) =>
										o.label.toLowerCase().includes(query)
									);
								}}
								onChange={(v: string) => {
									toStoreIdStr = v;
								}}
								placeholder={m.inv_common_search()}
								className="w-full"
								minSearchLength={0}
							/>
						</div>
					</div>
				</div>
				<div class="flex min-w-0 flex-1 flex-col">
					<DaisyUiLabel className="text-xs"
						>{m.inv_dept_indent_remarks()}</DaisyUiLabel
					>
					<textarea
						class="d-textarea-bordered d-textarea mt-1 w-full flex-1"
						rows="2"
						bind:value={remarks}
					></textarea>
				</div>
			</div>
		</DaisyUiCardBody>
	</DaisyUiCard>

	{#snippet lineItemsToolbarRight()}
		<DaisyUiTooltip
			tooltipText={m.inv_line_items_add()}
			className="d-tooltip-ghost"
		>
			<DaisyUiButton
				type="button"
				className="d-btn-primary d-btn-square d-btn-outline"
				disabled={submitting}
				title={m.inv_line_items_add()}
				onClick={() => void openLineDialogForCreate()}
			>
				<LucidePlus className="size-4" />
			</DaisyUiButton>
		</DaisyUiTooltip>
	{/snippet}

	<div
		class="flex flex-wrap items-center justify-end gap-3 border-t border-base-200 pt-6"
	>
		<DaisyUiButton
			type="submit"
			className="d-btn-primary d-btn-wide"
			disabled={submitting || createLines.length === 0}
			loading={submitting}
		>
			{m.inv_common_submit()}
		</DaisyUiButton>
	</div>

	<PrLineItemsCard
		viewOnly={false}
		createLinesCount={createLines.length}
		columns={lineColumns}
		rows={createLines}
		useColumnFilters={true}
		hideQuickFilter={true}
		hideAddButton={true}
		toolbarRight={lineItemsToolbarRight}
		onAddItem={() => void openLineDialogForCreate()}
		onEditLine={(line) => void openLineDialogForEdit(line)}
		onDeleteLine={deleteLine}
	/>
</form>
