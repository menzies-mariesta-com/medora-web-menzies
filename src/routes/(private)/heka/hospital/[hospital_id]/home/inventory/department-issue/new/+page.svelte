<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import MariTable, {
		type MariTableColumn,
		type MariTableColumnsInput
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { InvDepartmentIndentStatusTaggingEnum } from '$lib/model/enum/db-link';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import InventoryTablePickerDialogContent from '$lib/component/own/local/private/heka/inventory/InventoryTablePickerDialogContent.svelte';
	import PoManualLinesCard from '$lib/component/own/local/private/heka/inventory/purchase-order/PoManualLinesCard.svelte';
	import PrLineItemDialogContent from '$lib/component/own/local/private/heka/inventory/purchase-requisition/PrLineItemDialogContent.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import type { LineItemMetricTile } from '$lib/tool/inventory/line-item-metric-tiles.util';
	import { fetchStockLabelsForItemsAtStore } from '$lib/tool/inventory/fetch-stock-on-hand-for-items.util';
	import { formatPurchaseQtyCellWithIssueEquivalent } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import type { DepartmentIndentDetailLine } from '$lib/model/type/heka/department-indent-detail.type';
	const lifeCycle = new LifeCycleUtil();
	const toast = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	const issueCreateMode = $derived(
		page.url.searchParams.get('mode') === 'manual' ? 'manual' : 'indent'
	);

	let { data } = $props();
	const selectedInventoryFromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);
	const navFromStoreLabel = $derived.by(() => {
		const id = selectedInventoryFromStoreId;
		const nav = (
			data as {
				inventoryFromStoresForNav?: { id: number; storeName: string | null }[];
			}
		).inventoryFromStoresForNav;
		const row = nav?.find((s) => s.id === id);
		if (row?.storeName?.trim()) return row.storeName.trim();
		return '—';
	});

	type StoreRow = {
		id: number;
		storeName: string | null;
		branchId: string | null;
	};
	let stores = $state<StoreRow[]>([]);

	let toStoreIdStr = $state('');
	let remarks = $state('');

	let submitting = $state(false);

	type PendingIndentRow = {
		id: string;
		indentNo: string | null;
		fromStoreName: string | null;
		toStoreName: string | null;
		createdAt: string;
		statusTaggingId?: number;
		remarks?: string | null;
		itemNames?: string | null;
	};
	let pendingIndents = $state<PendingIndentRow[]>([]);
	let pendingIndentsLoading = $state(false);
	let issueIdByIndentId = $state<Record<string, string | null>>({});
	let actIndentId = $state<string | null>(null);
	let selectedIndentId = $state<string | null>(null);
	let indentPickerBusy = $state(false);

	let indentPreviewLines = $state<DepartmentIndentDetailLine[] | null>(null);
	let indentPreviewLoading = $state(false);
	let indentPreviewError = $state<string | null>(null);

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
	let lineDialogMetricTiles = $state<LineItemMetricTile[] | null>(null);

	const deptIssueManualLineStockEnrichment = $derived(
		issueCreateMode === 'manual' && hospitalId
			? {
					hospitalId,
					selectedStoreId: selectedInventoryFromStoreId,
					toStoreId:
						toStoreIdStr !== '' && Number.isFinite(Number(toStoreIdStr))
							? Number(toStoreIdStr)
							: null
				}
			: null
	);

	const departmentIssueListPath = $derived(
		hekaHospitalPageUrl(
			hospitalId,
			'/heka/home/inventory/department-issue' as any
		)
	);

	async function goBackToList() {
		await goto(resolve(departmentIssueListPath as any));
	}

	function issueDetailHref(issueId: string) {
		return `/heka/hospital/${hospitalId}/home/inventory/department-issue/${encodeURIComponent(issueId)}`;
	}

	async function loadPendingIndents() {
		if (!hospitalId || selectedInventoryFromStoreId == null) {
			pendingIndents = [];
			issueIdByIndentId = {};
			return;
		}
		pendingIndentsLoading = true;
		try {
			const ps = new URLSearchParams();
			ps.set('page', '1');
			ps.set('pageSize', '150');
			ps.set(
				'statusTaggingId',
				String(InvDepartmentIndentStatusTaggingEnum.PENDING_CENTRAL)
			);
			ps.set('toStoreId', String(selectedInventoryFromStoreId));
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-indent?${ps}`
			);
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as { data: PendingIndentRow[] };
			const rows = j.data ?? [];
			pendingIndents = rows;
			const map: Record<string, string | null> = {};
			await Promise.all(
				rows.map(async (row) => {
					const r = await fetch(
						`/api/heka/hospital/${hospitalId}/home/inventory/department-issue?sourceIndentId=${encodeURIComponent(row.id)}&pageSize=1`
					);
					if (!r.ok) {
						map[row.id] = null;
						return;
					}
					const jj = (await r.json()) as { data: { id: string }[] };
					map[row.id] = jj.data?.[0]?.id ?? null;
				})
			);
			issueIdByIndentId = map;
		} catch (e) {
			toast.addErrorToast('Indents', e);
			pendingIndents = [];
			issueIdByIndentId = {};
		} finally {
			pendingIndentsLoading = false;
		}
	}

	async function createIssueFromIndent(indentId: string) {
		if (!hospitalId || selectedInventoryFromStoreId == null) return;
		actIndentId = indentId;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/department-issue/from-indent`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						indentId,
						actingFromStoreId: selectedInventoryFromStoreId
					})
				}
			);
			if (!res.ok) {
				toast.addToast('Issue', StatusColorEnum.ERROR, await res.text());
				return;
			}
			const created = (await res.json()) as { id: string };
			if (created?.id) {
				await goto(resolve(issueDetailHref(created.id) as any));
			} else {
				selectedIndentId = null;
				await loadPendingIndents();
			}
		} finally {
			actIndentId = null;
		}
	}

	$effect(() => {
		if (issueCreateMode !== 'indent') return;
		void hospitalId;
		void selectedInventoryFromStoreId;
		void loadPendingIndents();
	});

	const selectedIndentRow = $derived(
		selectedIndentId == null
			? null
			: (pendingIndents.find((r) => r.id === selectedIndentId) ?? null)
	);

	async function openIndentPicker() {
		if (!hospitalId || selectedInventoryFromStoreId == null) return;
		indentPickerBusy = true;
		try {
			await loadPendingIndents();
			const result = await dialogService.open<PendingIndentRow>({
				fullScreen: true,
				component: InventoryTablePickerDialogContent,
				props: {
					title: m.inv_dept_issue_select_indent(),
					columns: indentPickerColumns as MariTableColumnsInput,
					rows: pendingIndents,
					pageSize: '150'
				}
			});
			if (result.confirmed && result.data) {
				selectedIndentId = result.data.id;
			}
		} finally {
			indentPickerBusy = false;
		}
	}

	const selectedIndentSummary = $derived.by(() => {
		if (!selectedIndentId) return '';
		const ind = pendingIndents.find((r) => r.id === selectedIndentId);
		if (!ind) return '';
		return `${ind.indentNo ?? '—'} · ${ind.fromStoreName ?? '—'} → ${ind.toStoreName ?? '—'}`;
	});

	function pickerDeptIndentStatusLabel(id: number): string {
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

	function pickerCsvItemLines(csv: string | null | undefined): string {
		const lines = (csv ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		return lines.join('\n') || '—';
	}

	const indentPickerColumns = $derived.by((): MariTableColumn[] => [
		{
			id: 'indentNo',
			header: m.inv_dept_indent_no(),
			field: 'indentNo',
			filterable: false,
			format: (_v, row) => (row as PendingIndentRow).indentNo ?? '—'
		},
		{
			id: 'status',
			header: m.status(),
			filterable: false,
			format: (_v, row) => {
				const id = (row as PendingIndentRow).statusTaggingId;
				return id != null ? pickerDeptIndentStatusLabel(id) : '—';
			}
		},
		{
			id: 'fromStore',
			header: m.inv_dept_indent_from(),
			field: 'fromStoreName',
			filterable: false,
			format: (_v, row) => (row as PendingIndentRow).fromStoreName ?? '—'
		},
		{
			id: 'toStore',
			header: m.inv_dept_indent_to(),
			field: 'toStoreName',
			filterable: false,
			format: (_v, row) => (row as PendingIndentRow).toStoreName ?? '—'
		},
		{
			id: 'items',
			header: m.inv_common_item(),
			field: 'itemNames',
			filterable: false,
			cellClass: 'whitespace-pre-line align-middle max-w-xs',
			format: (_v, row) =>
				pickerCsvItemLines((row as PendingIndentRow).itemNames)
		},
		{
			id: 'remarks',
			header: m.remark(),
			field: 'remarks',
			filterable: false,
			cellClass: 'whitespace-pre-wrap align-top max-w-xs',
			format: (_v, row) =>
				(row as PendingIndentRow).remarks?.trim() || '—'
		}
	]);

	$effect(() => {
		if (!hospitalId || !selectedIndentId) {
			indentPreviewLines = null;
			indentPreviewError = null;
			return;
		}
		void (async () => {
			indentPreviewLoading = true;
			indentPreviewError = null;
			try {
				const res = await fetch(
					`/api/heka/hospital/${hospitalId}/home/inventory/department-indent?id=${encodeURIComponent(selectedIndentId)}`
				);
				if (!res.ok) {
					throw new Error(String(res.status));
				}
				const j = (await res.json()) as
					| { lines?: DepartmentIndentDetailLine[] }
					| null;
				indentPreviewLines = j?.lines ?? null;
			} catch (e) {
				console.error('Failed to load indent lines', e);
				indentPreviewLines = null;
				indentPreviewError = 'Failed to load indent lines';
			} finally {
				indentPreviewLoading = false;
			}
		})();
	});

	$effect(() => {
		const ids = new Set(pendingIndents.map((r) => r.id));
		if (selectedIndentId != null && !ids.has(selectedIndentId)) {
			selectedIndentId = null;
		}
	});

	const toStoreOptions = $derived.by((): StoreRow[] => {
		const fromId = selectedInventoryFromStoreId;
		if (fromId == null) {
			return stores;
		}
		// Match PR "To store" behavior: show all stores (except the selected from store).
		// Do not restrict by branch, otherwise the dropdown can become empty even when
		// other stores exist in different branches.
		return stores.filter((s) => s.id !== fromId);
	});

	$effect(() => {
		// Use server-provided nav stores to avoid auth/cookie issues
		// with client-side store list fetching.
		void hospitalId;
		const nav =
			(
				data as {
					inventoryFromStoresForNav?: {
						id: number;
						storeName: string | null;
						branchId?: string | null;
					}[];
				}
			).inventoryFromStoresForNav ?? [];
		stores = nav.map((s) => ({
			id: s.id,
			storeName: s.storeName,
			branchId: s.branchId ?? null
		}));
	});

	$effect(() => {
		// If the current value disappears from options (e.g. nav store switch),
		// reset it so the select doesn't get "stuck" on an invalid id.
		const v = toStoreIdStr.trim();
		if (!v) return;
		const ids = new Set(toStoreOptions.map((s) => String(s.id)));
		if (!ids.has(v)) toStoreIdStr = '';
	});

	lifeCycle.onMount(() => {
		toStoreIdStr = '';
		remarks = '';
		createLines = [];
		selectedIndentId = null;
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
					stockEnrichment: deptIssueManualLineStockEnrichment,
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
					stockEnrichment: deptIssueManualLineStockEnrichment,
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

		const allIum = (await iumRes.json()) as IumOpt[];
		const allowed = new Set(detail.itemUnitMasterIds ?? []);
		line.iumList = allIum.filter((u) => allowed.has(u.id));

		line.itemLabel = detail.itemName ?? '—';
		line.itemSearch = line.itemLabel;

		const def = detail.defaultItemUnitMasterId;
		line.itemUnitMasterId =
			def != null && line.iumList.some((u) => u.id === def)
				? def
				: line.iumList[0]?.id ?? null;
	}

	function purchaseUnitForLine(line: PrLineForm): number | null {
		const ium = line.iumList.find((u) => u.id === line.itemUnitMasterId);
		return ium?.purchaseUnitId ?? null;
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

	async function refreshDeptIssueLineDialogMetricTiles() {
		if (!hospitalId || !lineItemDialogActive || issueCreateMode !== 'manual') {
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
				const map = await fetchStockLabelsForItemsAtStore(hospitalId, fromS, [itemId]);
				tiles.push({
					label: m.inv_line_modal_on_hand_selected(),
					value: map.get(itemId) ?? '0'
				});
			} else {
				if (fromS != null) {
					const map = await fetchStockLabelsForItemsAtStore(hospitalId, fromS, [itemId]);
					tiles.push({
						label: m.inv_line_modal_on_hand_selected(),
						value: map.get(itemId) ?? '0'
					});
				}
				if (toS != null) {
					const map = await fetchStockLabelsForItemsAtStore(hospitalId, toS, [itemId]);
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
		if (!lineItemDialogActive || issueCreateMode !== 'manual') {
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
		void issueCreateMode;
		void refreshDeptIssueLineDialogMetricTiles();
	});

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
			toast.addToast(v.title, StatusColorEnum.ERROR, v.detail);
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

	function buildLinesPayload():
		| { ok: true; lines: { itemId: number; quantity: string; unitId: number }[] }
		| { ok: false; title: string; detail: string } {
		const linesPayload: { itemId: number; quantity: string; unitId: number }[] = [];
		for (const ln of createLines) {
			const uid = purchaseUnitForLine(ln);
			if (ln.itemId == null || uid == null) {
				return {
					ok: false,
					title: 'Issue',
					detail: 'Each line needs an item and unit conversion.'
				};
			}
			const q = ln.quantity.trim();
			if (!q || !Number.isFinite(Number(q)) || Number(q) <= 0) {
				return {
					ok: false,
					title: 'Issue',
					detail: 'Invalid quantity on a line.'
				};
			}
			linesPayload.push({ itemId: ln.itemId, quantity: q, unitId: uid });
		}
		if (linesPayload.length === 0) {
			return {
				ok: false,
				title: 'Issue',
				detail: 'Add at least one line.'
			};
		}
		return { ok: true, lines: linesPayload };
	}

	const lineColumns = $derived.by((): MariTableColumn<PrLineForm>[] => [
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
			format: (_v: unknown, row: PrLineForm) => conversionLabelForLine(row)
		},
		{
			id: 'quantity',
			header: m.inv_common_quantity(),
			field: 'quantity',
			filterable: true,
			format: (_v: unknown, row: PrLineForm) =>
				formatPurchaseQtyCellWithIssueEquivalent(row)
		}
	]);

	async function submitCreate() {
		if (!hospitalId) return;
		const from = selectedInventoryFromStoreId;
		const toStoreId = toStoreIdStr !== '' ? Number(toStoreIdStr) : null;
		if (from == null || toStoreId == null) {
			toast.addToast('Issue', StatusColorEnum.ERROR, 'From / to store required');
			return;
		}

		const built = buildLinesPayload();
		if (!built.ok) {
			toast.addToast(built.title, StatusColorEnum.ERROR, built.detail);
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
				`/api/heka/hospital/${hospitalId}/home/inventory/department-issue`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				}
			);
			if (!res.ok) {
				toast.addToast('Issue', StatusColorEnum.ERROR, await res.text());
				return;
			}
			await goBackToList();
		} finally {
			submitting = false;
		}
	}
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<div class="mb-5 flex flex-wrap items-center gap-2">
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
			<DaisyUiCardBodyTitle className="mb-0 min-w-0 flex-1">
				{issueCreateMode === 'manual'
					? m.inv_dept_issue_new_title_manual()
					: m.inv_dept_issue_new_title()}
			</DaisyUiCardBodyTitle>
		</div>

		{#if issueCreateMode === 'manual'}
			<form
				onsubmit={(e) => {
					e.preventDefault();
					void submitCreate();
				}}
			>
				<fieldset class="m-0 min-w-0 border-0 p-0">
					<div class="mb-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
						<div class="min-w-0 flex-1">
							<div class="flex flex-col gap-6 sm:flex-row sm:items-stretch">
								<div class="min-w-0 flex-1">
									<div class="flex h-full flex-col justify-between gap-3">
										<div class="flex min-w-0 flex-col gap-2">
											<DaisyUiLabel className="text-xs">{m.inv_nav_from_store()}</DaisyUiLabel>
											<input
												type="text"
												readonly
												disabled
												class="d-input d-input-bordered w-full text-sm"
												value={navFromStoreLabel}
												aria-label={m.inv_nav_from_store()}
											/>
										</div>
										<div class="flex min-w-0 flex-col gap-2">
											<DaisyUiLabel forText="di-issue-to-store" className="text-xs"
												>{m.inv_dept_indent_to()}</DaisyUiLabel
											>
											<DaisyUISearchSelect
												inputId="di-issue-to-store"
												value={toStoreIdStr}
												options={toStoreOptions.map((s) => ({
													label: s.storeName?.trim() ? s.storeName.trim() : '—',
													value: String(s.id)
												}))}
												onChange={(v: string) => {
													toStoreIdStr = v;
												}}
												placeholder={m.inv_common_search()}
												className="d-input w-full"
											/>
										</div>
									</div>
								</div>

								<div class="min-w-0 flex-1 flex flex-col">
									<DaisyUiLabel className="text-xs">{m.inv_dept_indent_remarks()}</DaisyUiLabel>
									<textarea
										class="d-textarea d-textarea-bordered mt-1 w-full flex-1"
										rows="2"
										bind:value={remarks}
									></textarea>
								</div>
							</div>
						</div>
					</div>
				</fieldset>

				<PoManualLinesCard
					totalCount={createLines.length}
					columns={lineColumns}
					rows={createLines}
					useColumnFilters={true}
					hideQuickFilter={true}
					hideAddButton={true}
					toolbarRight={manualLinesToolbarRight}
					onAddItem={() => void openLineDialogForCreate()}
					onEditLine={(line) => void openLineDialogForEdit(line)}
					onDeleteLine={deleteLine}
				/>
			</form>
			{#snippet manualLinesToolbarRight()}
				<div class="flex items-center gap-2">
					<DaisyUiTooltip tooltipText={m.inv_line_items_add()} className="d-tooltip-ghost">
						<DaisyUiButton
							type="button"
							className="d-btn-primary d-btn-square d-btn-outline"
							disabled={submitting}
							aria-label={m.inv_line_items_add()}
							onClick={() => void openLineDialogForCreate()}
						>
							<LucidePlus className="size-4" />
						</DaisyUiButton>
					</DaisyUiTooltip>
					<DaisyUiButton
						type="submit"
						className="d-btn-primary"
						disabled={submitting}
						loading={submitting}
					>
						{m.inv_common_submit()}
					</DaisyUiButton>
				</div>
			{/snippet}
		{:else}
			{#if selectedInventoryFromStoreId == null}
				<div class="d-alert d-alert-warning text-sm" role="status">
					{m.inv_dept_issue_select_store_hint()}
				</div>
			{:else}
				<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
					<fieldset class="m-0 min-w-0 flex-1 border-0 p-0">
						<div class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
							<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
								<DaisyUiLabel className="shrink-0 sm:w-36" forText="di-issue-indent-display">
									{m.inv_dept_issue_select_indent()}
								</DaisyUiLabel>
								<div
									class="flex min-w-0 max-w-80 flex-1 flex-wrap items-stretch gap-2 sm:flex-nowrap"
								>
									<input
										id="di-issue-indent-display"
										type="text"
										readonly
										disabled
										class="d-input d-input-bordered min-w-0 flex-1 text-sm"
										value={selectedIndentSummary || '—'}
										aria-label={m.inv_dept_issue_select_indent()}
									/>
									<DaisyUiButton
										type="button"
										className="d-btn-outline shrink-0"
										disabled={
											pendingIndentsLoading || indentPickerBusy
										}
										loading={indentPickerBusy}
										onClick={() => void openIndentPicker()}
									>
										{m.inv_common_btn_select()}
									</DaisyUiButton>
								</div>
							</div>
						</div>
					</fieldset>
				</div>
				{#if !pendingIndentsLoading && pendingIndents.length === 0}
					<div
						class="rounded-box border border-dashed border-base-300 bg-base-200/30 px-4 py-3 text-sm text-base-content/80"
					>
						{m.inv_dept_issue_no_pending_indents()}
					</div>
				{/if}
				{#if selectedIndentRow}
					<p class="mb-3 text-sm text-base-content/80">
						<span class="opacity-70">{m.inv_pr_route()}</span>
						<strong
							>{selectedIndentRow.fromStoreName ?? '—'} → {selectedIndentRow.toStoreName ?? '—'}</strong
						>
					</p>
					<div class="mb-4 rounded-box border border-base-300 bg-base-100 p-3">
						<div class="mb-2 text-sm font-medium">
							{m.inv_di_detail_lines()}
						</div>
						{#if indentPreviewLoading}
							<div class="text-xs text-base-content/70">
								{m.loading()}
							</div>
						{:else if indentPreviewError}
							<div class="text-xs text-error">{indentPreviewError}</div>
						{:else if !indentPreviewLines || indentPreviewLines.length === 0}
							<div class="text-xs text-base-content/70">—</div>
						{:else}
							<MariTable
								rows={indentPreviewLines}
								columns={[
									{
										id: 'itemName',
										header: m.inv_common_item(),
										field: 'itemName',
										filterable: false,
										format: (_v, r: DepartmentIndentDetailLine) =>
											r.itemName ?? '—'
									},
									{
										id: 'quantity',
										header: m.inv_common_quantity(),
										field: 'quantity',
										filterable: false,
										format: (_v, r: DepartmentIndentDetailLine) =>
											r.quantity
									},
									{
										id: 'unitName',
										header: m.inv_common_unit(),
										field: 'unitName',
										filterable: false,
										format: (_v, r: DepartmentIndentDetailLine) =>
											r.unitName ?? '—'
									}
								] as MariTableColumn[]}
								showRowActions={false}
								actionsVariant="none"
								showRefreshButton={false}
							/>
						{/if}
					</div>
				{/if}
				{#if selectedIndentId}
					{@const selIndentId = selectedIndentId}
					<DaisyUiCardBodyAction className="mt-8 flex flex-wrap gap-3 border-t border-base-200 pt-6">
						{#if issueIdByIndentId[selIndentId]}
							<DaisyUiButton
								type="button"
								className="d-btn-wide d-btn-primary"
								disabled={pendingIndentsLoading}
								onClick={() =>
									void goto(
										resolve(
											issueDetailHref(issueIdByIndentId[selIndentId]!) as any
										)
									)}
							>
								{m.inv_dept_issue_btn_open()}
							</DaisyUiButton>
						{:else}
							<DaisyUiButton
								type="button"
								className="d-btn-wide d-btn-primary"
								disabled={actIndentId != null || pendingIndentsLoading}
								loading={actIndentId === selIndentId}
								onClick={() => void createIssueFromIndent(selIndentId)}
							>
								{m.inv_dept_issue_btn_create()}
							</DaisyUiButton>
						{/if}
					</DaisyUiCardBodyAction>
				{/if}
			{/if}
		{/if}
	</DaisyUiCardBody>
</DaisyUiCard>
