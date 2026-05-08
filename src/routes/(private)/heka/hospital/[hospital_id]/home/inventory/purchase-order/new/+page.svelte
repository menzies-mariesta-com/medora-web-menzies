<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import InventoryTablePickerDialogContent from '$lib/component/own/local/private/heka/inventory/InventoryTablePickerDialogContent.svelte';
	import PoManualLineDialogContent from '$lib/component/own/local/private/heka/inventory/purchase-order/PoManualLineDialogContent.svelte';
	import PoManualLinesCard from '$lib/component/own/local/private/heka/inventory/purchase-order/PoManualLinesCard.svelte';
	import PoPrLineEditDialogContent from '$lib/component/own/local/private/heka/inventory/purchase-order/PoPrLineEditDialogContent.svelte';
	import MariTable, {
		type MariTableColumn,
		type MariTableColumnsInput
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { m } from '$lib/paraglide/messages';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import { InvPrStatusTaggingEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import type { PrLineMetricsResponse } from '$lib/model/type/heka/pr-line-metrics.type';
	import {
		tilesFromPrItemMetricsRow,
		type LineItemMetricTile
	} from '$lib/tool/inventory/line-item-metric-tiles.util';
	import {
		formatPurchaseQtyCellWithIssueEquivalent,
		itemUnitMastersResponseToCatalog,
		trimInventoryNumericDisplay
	} from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

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

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);
	const poListPath = $derived(
		hekaHospitalPageUrl(hospitalId, '/heka/home/inventory/purchase-order' as any)
	);

	function purchaseOrderDetailHref(poId: string) {
		return `/heka/hospital/${hospitalId}/home/inventory/purchase-order/${encodeURIComponent(poId)}`;
	}

	const toastService = new ToastService();

	type PoCreateLineTableRow = {
		id: number;
		prLineId: number;
		itemName: string | null;
		/** Item Unit Master (same resolution as PR line: item + purchase UOM). */
		itemUnitMasterId: number | null;
		itemUnitMasterConversion: string | null;
		qtyRemaining: string;
		quantity: string;
		unitPrice: string;
		manufacturerId: string;
	};

	type CreatedPo = { id: string };

	let poCreateMode = $state<'pr' | 'manual'>('pr');
	let manualUrlBootstrapped = $state(false);

	$effect(() => {
		if (manualUrlBootstrapped) return;
		manualUrlBootstrapped = true;
		if (page.url.searchParams.get('mode') === 'manual') {
			poCreateMode = 'manual';
			manualStoreId = selectedInventoryFromStoreId;
			manualLines = [];
			supplierId = null;
		}
	});

	let approvedPrList = $state<
		{
			id: string;
			prNo?: string | null;
			fromStoreName: string | null;
			toStoreName: string | null;
			statusName?: string | null;
			remarks?: string | null;
			itemNames?: string | null;
			poCount?: number;
		}[]
	>([]);
	type ApprovedPrOptionRow = (typeof approvedPrList)[number];
	let selectedPrId = $state<string | null>(null);
	let prPickerBusy = $state(false);
	let prDetailForCreate = $state<{
		fromStoreName: string | null;
		toStoreName: string | null;
		lines: {
			id: number;
			itemId: number;
			quantity: string;
			unitId: number;
			qtyRemaining: string;
			itemName?: string | null;
			itemUnitMasterId?: number | null;
			itemUnitMasterConversion?: string | null;
		}[];
	} | null>(null);
	let supplierId = $state<number | null>(null);
	let poLineDraft = $state<
		{
			prLineId: number;
			itemId: number;
			quantity: string;
			unitId: number;
			unitPrice: string;
			manufacturerId: string;
		}[]
	>([]);
	let createSubmitting = $state(false);
	/** Hospital IUM factors for PO-from-PR line table (rows carry `itemUnitMasterId` only). */
	let poCreateIumCatalog = $state(new Map());

	type IumOpt = {
		id: number;
		purchaseUnitId: number;
		issueUnitId: number;
		conversionDisplay: string;
		purchaseUnitName: string;
		issueUnitName: string;
		purchaseConversionFactor?: string;
		issueConversionFactor?: string;
	};

	type ManualLineForm = {
		key: string;
		itemSearch: string;
		hits: { id: number; name: string | null }[];
		itemId: number | null;
		itemLabel: string;
		quantity: string;
		unitPrice: string;
		manufacturerId: string;
		iumList: IumOpt[];
		itemUnitMasterId: number | null;
	};

	let manualStoreId = $state<number | null>(null);
	let manualLines = $state<ManualLineForm[]>([]);

	let manualLineDialogActive = $state(false);
	let editingManualKey = $state<string | null>(null);
	let draftManualLine = $state<ManualLineForm>(newManualLine());
	let poManualLineMetricTiles = $state<LineItemMetricTile[] | null>(null);

	let poPrLineDialogActive = $state(false);
	let draftPoPrLine = $state<{
		prLineId: number;
		quantity: string;
		unitPrice: string;
		manufacturerId: string;
	} | null>(null);
	let poMfgLabelByPrLine = $state<Record<number, string>>({});
	let manualMfgLabelByKey = $state<Record<string, string>>({});

	function newManualLine(): ManualLineForm {
		return {
			key: crypto.randomUUID(),
			itemSearch: '',
			hits: [],
			itemId: null,
			itemLabel: '',
			quantity: '1',
			unitPrice: '',
			manufacturerId: '',
			iumList: [],
			itemUnitMasterId: null
		};
	}

	function purchaseUnitForManual(line: ManualLineForm): number | null {
		const ium = line.iumList.find((u) => u.id === line.itemUnitMasterId);
		return ium?.purchaseUnitId ?? null;
	}

	function conversionLabelForManualLine(line: ManualLineForm): string {
		const ium = line.iumList.find((u) => u.id === line.itemUnitMasterId);
		return ium?.conversionDisplay ?? '—';
	}

	const manualLineTableColumns: MariTableColumn<ManualLineForm>[] = [
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
			format: (_v, row) => conversionLabelForManualLine(row)
		},
		{
			id: 'quantity',
			header: m.inv_common_quantity(),
			field: 'quantity',
			filterable: true,
			format: (_v, row) => formatPurchaseQtyCellWithIssueEquivalent(row)
		},
		{
			id: 'unitPrice',
			header: m.inv_po_line_unit_price(),
			field: 'unitPrice',
			filterable: true,
			format: (_v, row) => {
				const t = String(row.unitPrice ?? '').trim();
				return t ? trimInventoryNumericDisplay(t, 4) : '—';
			}
		},
		{
			id: 'manufacturerId',
			header: m.inv_common_manufacturer(),
			field: 'manufacturerId',
			filterable: true,
			format: (_v, row) => manualMfgLabelByKey[row.key] ?? (row.manufacturerId?.trim() ? '…' : '—')
		}
	];

	async function openManualLineDialogForCreate() {
		editingManualKey = null;
		draftManualLine = newManualLine();
		manualLineDialogActive = true;
		try {
			await dialogService.open({
				title: m.inv_line_modal_title_add(),
				modalClassName: 'max-w-2xl',
				component: PoManualLineDialogContent,
				props: {
					draftManualLine,
					searchItemsFn: searchItemsForManual,
					searchManufacturersFn: searchManufacturers,
					getManufacturerLabelForValue,
					onPickItem: pickDraftManualItem,
					onSaveAttempt: saveManualDraftLine,
					getLineItemMetricTiles: () => poManualLineMetricTiles
				}
			});
		} finally {
			manualLineDialogActive = false;
			editingManualKey = null;
		}
	}

	async function openManualLineDialogForEdit(line: ManualLineForm) {
		editingManualKey = line.key;
		draftManualLine = {
			...line,
			hits: [...line.hits],
			iumList: [...line.iumList]
		};
		manualLineDialogActive = true;
		try {
			await dialogService.open({
				title: m.inv_line_modal_title_edit(),
				modalClassName: 'max-w-2xl',
				component: PoManualLineDialogContent,
				props: {
					draftManualLine,
					searchItemsFn: searchItemsForManual,
					searchManufacturersFn: searchManufacturers,
					getManufacturerLabelForValue,
					onPickItem: pickDraftManualItem,
					onSaveAttempt: saveManualDraftLine,
					getLineItemMetricTiles: () => poManualLineMetricTiles
				}
			});
		} finally {
			manualLineDialogActive = false;
			editingManualKey = null;
		}
	}

	async function pickDraftManualItem(itemId: number) {
		await hydrateManualLineItem(draftManualLine, itemId);
		// Keep the same `draftManualLine` object reference while the dialog is open.
	}

	function saveManualDraftLine(): boolean {
		const unitId = purchaseUnitForManual(draftManualLine);
		if (draftManualLine.itemId == null || unitId == null) {
			toastService.addErrorToast(
				'Could not save line',
				'Select an item and a purchase unit conversion.'
			);
			return false;
		}
		const q = draftManualLine.quantity.trim();
		const p = draftManualLine.unitPrice.trim();
		if (!q || !Number.isFinite(Number(q)) || Number(q) <= 0) {
			toastService.addErrorToast('Could not save line', 'Enter a valid quantity greater than 0.');
			return false;
		}
		if (!Number.isFinite(Number(p)) || Number(p) < 0) {
			toastService.addErrorToast('Could not save line', 'Enter a valid unit price.');
			return false;
		}
		const saved = { ...draftManualLine, quantity: q, unitPrice: p };
		if (editingManualKey) {
			manualLines = manualLines.map((l) => (l.key === editingManualKey ? saved : l));
		} else {
			manualLines = [...manualLines, saved];
		}
		return true;
	}

	function deleteManualLine(lineKey: string) {
		manualLines = manualLines.filter((l) => l.key !== lineKey);
	}

	function sumCurrentManualDraftForLine(itemId: number, unitId: number): string {
		let s = 0;
		for (const l of manualLines) {
			if (editingManualKey && l.key === editingManualKey) continue;
			const u = purchaseUnitForManual(l);
			if (l.itemId === itemId && u === unitId) s += Number(l.quantity) || 0;
		}
		if (
			draftManualLine.itemId === itemId &&
			purchaseUnitForManual(draftManualLine) === unitId
		) {
			s += Number(draftManualLine.quantity) || 0;
		}
		return String(s);
	}

	async function refreshPoManualLineMetrics() {
		if (!hospitalId || !manualLineDialogActive || poCreateMode !== 'manual') {
			poManualLineMetricTiles = null;
			return;
		}
		const unitId = purchaseUnitForManual(draftManualLine);
		if (
			manualStoreId == null ||
			draftManualLine.itemId == null ||
			unitId == null
		) {
			poManualLineMetricTiles = null;
			return;
		}
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition/item-metrics`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fromStoreId: manualStoreId,
					prId: null,
					lines: [{ itemId: draftManualLine.itemId, unitId }]
				})
			}
		);
		if (!res.ok) {
			poManualLineMetricTiles = null;
			return;
		}
		const j = (await res.json()) as PrLineMetricsResponse;
		const row = j.rows[0];
		if (!row) {
			poManualLineMetricTiles = null;
			return;
		}
		const current = sumCurrentManualDraftForLine(draftManualLine.itemId, unitId);
		poManualLineMetricTiles = tilesFromPrItemMetricsRow(row, current, {
			store: m.inv_pr_line_metric_store(),
			global: m.inv_pr_line_metric_global(),
			pendingPr: m.inv_pr_line_metric_pending_pr_qty(),
			pendingPo: m.inv_po_line_metric_pending_po_qty(),
			current: m.inv_pr_line_metric_current()
		});
	}

	$effect(() => {
		if (!manualLineDialogActive || poCreateMode !== 'manual') {
			poManualLineMetricTiles = null;
			return;
		}
		void draftManualLine.itemId;
		void draftManualLine.itemUnitMasterId;
		void draftManualLine.quantity;
		void manualStoreId;
		void manualLines;
		void editingManualKey;
		void hospitalId;
		void refreshPoManualLineMetrics();
	});

	async function openPoPrLineDialog(prLineId: number) {
		const row = poLineDraft.find((r) => r.prLineId === prLineId);
		if (!row) return;
		draftPoPrLine = {
			prLineId: row.prLineId,
			quantity: row.quantity,
			unitPrice: row.unitPrice,
			manufacturerId: row.manufacturerId
		};
		poPrLineDialogActive = true;
		try {
			await dialogService.open({
				title: m.inv_line_edit_short_title(),
				modalClassName: 'max-w-lg',
				component: PoPrLineEditDialogContent,
				props: {
					draftPoPrLine,
					searchManufacturersFn: searchManufacturers,
					getManufacturerLabelForValue,
					onSaveAttempt: savePoPrLineDraft
				}
			});
		} finally {
			poPrLineDialogActive = false;
			draftPoPrLine = null;
		}
	}

	function savePoPrLineDraft(): boolean {
		if (!draftPoPrLine) return false;
		const q = draftPoPrLine.quantity.trim();
		const p = draftPoPrLine.unitPrice.trim();
		if (!q || !Number.isFinite(Number(q)) || Number(q) <= 0) {
			toastService.addErrorToast('Could not save line', 'Enter a valid quantity greater than 0.');
			return false;
		}
		if (!Number.isFinite(Number(p)) || Number(p) < 0) {
			toastService.addErrorToast('Could not save line', 'Enter a valid unit price.');
			return false;
		}
		patchPoCreateLine(draftPoPrLine.prLineId, {
			quantity: q,
			unitPrice: p,
			manufacturerId: draftPoPrLine.manufacturerId.trim()
		});
		return true;
	}

	function removePoPrLine(prLineId: number) {
		poLineDraft = poLineDraft.filter((r) => r.prLineId !== prLineId);
	}

	async function hydrateManualLineItem(line: ManualLineForm, itemId: number) {
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

	async function searchItemsForManual(
		q: string
	): Promise<{ label: string; value: string }[]> {
		if (!hospitalId) return [];
		const sp = new URLSearchParams();
		sp.set('pageSize', String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT));
		const name = q.trim();
		if (name) sp.set('name', name);
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?${sp.toString()}`
		);
		if (!res.ok) return [];
		const j = (await res.json()) as { data: { id: number; itemName?: string | null }[] };
		return (j.data ?? []).map((r) => ({
			label: r.itemName ?? '—',
			value: String(r.id)
		}));
	}

	async function searchManufacturers(q: string) {
		if (!hospitalId) return [];
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/manufacture-setup?mode=search&q=${encodeURIComponent(q)}&limit=30`
		);
		if (!res.ok) return [];
		const rows = (await res.json()) as { id: number; name: string; code: string | null }[];
		if (!Array.isArray(rows)) return [];
		return rows.map((r) => {
			const code = r.code?.trim();
			return {
				label: code ? `${r.name} (${code})` : r.name,
				value: String(r.id)
			};
		});
	}

	async function getManufacturerLabelForValue(value: string) {
		if (!hospitalId || !value?.trim()) return '';
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/manufacture-setup?id=${encodeURIComponent(value)}`
		);
		if (!res.ok) return '—';
		const data = (await res.json()) as { name?: string } | null;
		if (data == null) return '—';
		return data.name ?? '—';
	}

	$effect(() => {
		const draft = poLineDraft;
		let cancel = false;
		void (async () => {
			const next: Record<number, string> = {};
			for (const d of draft) {
				const mid = d.manufacturerId?.trim();
				if (!mid) {
					next[d.prLineId] = '—';
					continue;
				}
				next[d.prLineId] = await getManufacturerLabelForValue(mid);
			}
			if (!cancel) poMfgLabelByPrLine = next;
		})();
		return () => {
			cancel = true;
		};
	});

	$effect(() => {
		const lines = manualLines;
		let cancel = false;
		void (async () => {
			const next: Record<string, string> = {};
			for (const l of lines) {
				const mid = l.manufacturerId?.trim();
				if (!mid) {
					next[l.key] = '—';
					continue;
				}
				next[l.key] = await getManufacturerLabelForValue(mid);
			}
			if (!cancel) manualMfgLabelByKey = next;
		})();
		return () => {
			cancel = true;
		};
	});

	async function loadApprovedPrs() {
		if (!hospitalId) return;
		const toStoreId = selectedInventoryFromStoreId;
		if (toStoreId == null) {
			approvedPrList = [];
			selectedPrId = null;
			prDetailForCreate = null;
			poLineDraft = [];
			poCreateIumCatalog = new Map();
			return;
		}
		const sp = new URLSearchParams();
		sp.set('mode', 'poEligible');
		sp.set('statusTaggingId', String(InvPrStatusTaggingEnum.APPROVED));
		sp.set('toStoreId', String(toStoreId));
		sp.set('pageSize', '150');
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition?${sp.toString()}`,
			{ method: 'GET' }
		);
		if (!res.ok) {
			approvedPrList = [];
			return;
		}
		const j = (await res.json()) as {
			data: {
				id: string;
				prNo?: string | null;
				fromStoreName: string | null;
				toStoreName: string | null;
				statusName?: string | null;
				remarks?: string | null;
				itemNames?: string | null;
				poCount?: number;
			}[];
		};
		approvedPrList = j.data ?? [];
	}

	async function openPrPicker() {
		if (!hospitalId || selectedInventoryFromStoreId == null) return;
		prPickerBusy = true;
		try {
			await loadApprovedPrs();
			const result = await dialogService.open<ApprovedPrOptionRow>({
				fullScreen: true,
				component: InventoryTablePickerDialogContent,
				props: {
					title: m.inv_po_select_pr(),
					columns: prPickerColumns as MariTableColumnsInput,
					rows: approvedPrList,
					pageSize: '150'
				}
			});
			if (result.confirmed && result.data) {
				await onSelectPr(result.data.id);
			}
		} finally {
			prPickerBusy = false;
		}
	}

	const selectedPrSummary = $derived.by(() => {
		if (!selectedPrId) return '';
		const pr = approvedPrList.find((p) => p.id === selectedPrId);
		if (!pr) return '';
		return `${pr.prNo ?? '—'} · ${pr.fromStoreName ?? '—'} → ${pr.toStoreName ?? '—'}`;
	});

	function pickerCsvItemLines(csv: string | null | undefined): string {
		const lines = (csv ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		return lines.join('\n') || '—';
	}

	const prPickerColumns = $derived.by((): MariTableColumn[] => [
		{
			id: 'prNo',
			header: m.inv_pr_no(),
			field: 'prNo',
			filterable: false,
			format: (_v, row) => (row as ApprovedPrOptionRow).prNo ?? '—'
		},
		{
			id: 'fromStore',
			header: m.inv_dept_indent_from(),
			field: 'fromStoreName',
			filterable: false,
			format: (_v, row) => (row as ApprovedPrOptionRow).fromStoreName ?? '—'
		},
		{
			id: 'toStore',
			header: m.inv_dept_indent_to(),
			field: 'toStoreName',
			filterable: false,
			format: (_v, row) => (row as ApprovedPrOptionRow).toStoreName ?? '—'
		},
		{
			id: 'status',
			header: m.status(),
			field: 'statusName',
			filterable: false,
			format: (_v, row) => (row as ApprovedPrOptionRow).statusName ?? '—'
		},
		{
			id: 'items',
			header: m.inv_common_item(),
			field: 'itemNames',
			filterable: false,
			cellClass: 'whitespace-pre-line align-top max-w-xs',
			format: (_v, row) =>
				pickerCsvItemLines((row as ApprovedPrOptionRow).itemNames)
		},
		{
			id: 'remarks',
			header: m.remark(),
			field: 'remarks',
			filterable: false,
			cellClass: 'whitespace-pre-wrap align-top max-w-xs',
			format: (_v, row) =>
				(row as ApprovedPrOptionRow).remarks?.trim() || '—'
		},
		{
			id: 'poCount',
			header: m.inv_picker_linked_po_count(),
			field: 'poCount',
			filterable: false,
			format: (_v, row) =>
				String((row as ApprovedPrOptionRow).poCount ?? 0)
		}
	]);

	async function onSelectPr(pr: string | null) {
		selectedPrId = pr;
		prDetailForCreate = null;
		poLineDraft = [];
		poCreateIumCatalog = new Map();
		if (!hospitalId || !pr) return;
		const [res, iumRes] = await Promise.all([
			fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition?id=${encodeURIComponent(pr)}`,
				{ method: 'GET' }
			),
			fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?mode=itemUnitMasters`,
				{ method: 'GET' }
			)
		]);
		if (iumRes.ok) {
			const iumRows = (await iumRes.json()) as {
				id: number;
				purchaseConversionFactor?: string | number | null;
				issueConversionFactor?: string | number | null;
				issueUnitName?: string | null;
			}[];
			poCreateIumCatalog = itemUnitMastersResponseToCatalog(iumRows);
		}
		if (!res.ok) return;
		const j = (await res.json()) as {
			fromStoreName: string | null;
			toStoreName: string | null;
			lines: {
				id: number;
				itemId: number;
				quantity: string;
				unitId: number;
				qtyRemaining: string;
				itemName?: string | null;
				itemUnitMasterId?: number | null;
				itemUnitMasterConversion?: string | null;
			}[];
		};
		prDetailForCreate = {
			fromStoreName: j.fromStoreName ?? null,
			toStoreName: j.toStoreName ?? null,
			lines: j.lines ?? []
		};
		poLineDraft = (j.lines ?? []).map((ln) => ({
			prLineId: ln.id,
			itemId: ln.itemId,
			quantity: ln.qtyRemaining,
			unitId: ln.unitId,
			unitPrice: '',
			manufacturerId: ''
		}));
	}

	async function submitCreateManual() {
		const storeId = selectedInventoryFromStoreId ?? manualStoreId;
		if (!hospitalId || storeId == null || supplierId == null) {
			toastService.addErrorToast(
				'Could not create purchase order',
				'Choose From store in the top bar, and select a supplier.'
			);
			return;
		}
		const lines: {
			itemId: number;
			quantity: string;
			unitId: number;
			unitPrice: string;
			manufacturerId: number | null;
		}[] = [];
		for (const ln of manualLines) {
			const unitId = purchaseUnitForManual(ln);
			if (ln.itemId == null || unitId == null) {
				toastService.addErrorToast(
					'Could not create purchase order',
					'Each line needs an item and purchase unit (conversion).'
				);
				return;
			}
			const q = ln.quantity.trim();
			const p = ln.unitPrice.trim();
			const m = ln.manufacturerId.trim();
			if (!q || !Number.isFinite(Number(q)) || Number(q) <= 0) {
				toastService.addErrorToast('Could not create purchase order', 'Invalid quantity.');
				return;
			}
			if (!p || !Number.isFinite(Number(p)) || Number(p) <= 0) {
				toastService.addErrorToast('Could not create purchase order', 'Invalid unit price.');
				return;
			}
			lines.push({
				itemId: ln.itemId,
				quantity: q,
				unitId,
				unitPrice: p,
				manufacturerId: m === '' ? null : Number(m)
			});
		}
		if (lines.length === 0) {
			toastService.addErrorToast('Could not create purchase order', 'Add at least one line.');
			return;
		}
		createSubmitting = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						mode: 'direct',
						storeId,
						supplierId,
						lines
					})
				}
			);
			if (!res.ok) {
				toastService.addErrorToast('Could not create purchase order', await res.text());
				return;
			}
			const created = (await res.json()) as CreatedPo;
			manualLines = [];
			manualStoreId = null;
			poCreateMode = 'pr';
			supplierId = null;
			if (created?.id) {
				await goto(purchaseOrderDetailHref(created.id));
			}
		} catch (e) {
			toastService.addErrorToast('Could not create purchase order', e);
		} finally {
			createSubmitting = false;
		}
	}

	async function submitCreatePo() {
		if (
			!hospitalId ||
			selectedInventoryFromStoreId == null ||
			!selectedPrId ||
			supplierId == null
		) {
			toastService.addErrorToast('Could not create purchase order', 'PR and supplier are required.');
			return;
		}
		if (poLineDraft.length === 0) {
			toastService.addErrorToast(
				'Could not create purchase order',
				'Add at least one line. Reselect the PR to restore all lines.'
			);
			return;
		}
		const lines = poLineDraft
			.map((l) => {
				const q = l.quantity.trim();
				const p = l.unitPrice.trim();
				const m = l.manufacturerId.trim();
				return {
					prLineId: l.prLineId,
					itemId: l.itemId,
					quantity: q,
					unitId: l.unitId,
					unitPrice: p,
					manufacturerId: m === '' ? null : Number(m)
				};
			})
			.filter((l) => Number(l.quantity) > 0);
		if (lines.length === 0) {
			toastService.addErrorToast('Could not create purchase order', 'At least one line with quantity.');
			return;
		}
		for (const l of lines) {
			if (!l.unitPrice || !Number.isFinite(Number(l.unitPrice)) || Number(l.unitPrice) <= 0) {
				toastService.addErrorToast('Could not create purchase order', 'Invalid unit price.');
				return;
			}
			if (
				l.manufacturerId != null &&
				(!Number.isFinite(l.manufacturerId) || l.manufacturerId <= 0)
			) {
				toastService.addErrorToast('Could not create purchase order', 'Invalid manufacturer id.');
				return;
			}
		}
		createSubmitting = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						storeId: selectedInventoryFromStoreId,
						prId: selectedPrId,
						supplierId,
						lines
					})
				}
			);
			if (!res.ok) {
				toastService.addErrorToast('Could not create purchase order', await res.text());
				return;
			}
			const created = (await res.json()) as CreatedPo;
			selectedPrId = null;
			prDetailForCreate = null;
			poLineDraft = [];
			poCreateIumCatalog = new Map();
			supplierId = null;
			if (created?.id) {
				await goto(purchaseOrderDetailHref(created.id));
			}
		} catch (e) {
			toastService.addErrorToast('Could not create purchase order', e);
		} finally {
			createSubmitting = false;
		}
	}

	$effect(() => {
		if (poCreateMode !== 'pr' || !hospitalId) return;
		void selectedInventoryFromStoreId;
		void (async () => {
			await loadApprovedPrs();
		})();
	});

	function patchPoCreateLine(
		prLineId: number,
		patch: Partial<(typeof poLineDraft)[number]>
	) {
		poLineDraft = poLineDraft.map((r) =>
			r.prLineId === prLineId ? { ...r, ...patch } : r
		);
	}

	const poCreateLineRows = $derived.by((): PoCreateLineTableRow[] => {
		const prd = prDetailForCreate;
		if (!prd) return [];
		return poLineDraft.map((row) => {
			const pl = prd.lines.find((l) => l.id === row.prLineId);
			return {
				id: row.prLineId,
				prLineId: row.prLineId,
				itemName: pl?.itemName ?? null,
				itemUnitMasterId:
					typeof pl?.itemUnitMasterId === 'number' ? pl.itemUnitMasterId : null,
				itemUnitMasterConversion: pl?.itemUnitMasterConversion?.trim()
					? pl.itemUnitMasterConversion
					: null,
				qtyRemaining: pl?.qtyRemaining ?? '—',
				quantity: row.quantity,
				unitPrice: row.unitPrice,
				manufacturerId: row.manufacturerId
			};
		});
	});

	const poCreateLineColumns = $derived.by((): MariTableColumn<PoCreateLineTableRow>[] => {
		const cat = poCreateIumCatalog;
		return [
		{
			id: 'itemName',
			header: m.inv_common_item(),
			field: 'itemName',
			format: (_v, row) => row.itemName ?? '—'
		},
		{
			id: 'itemUnitMasterConversion',
			header: m.inv_common_unit(),
			field: 'itemUnitMasterConversion',
			widthClass: 'min-w-[12rem] max-w-md',
			headerClass: 'min-w-[12rem] max-w-md',
			cellClass: 'whitespace-normal align-middle',
			filterable: false,
			format: (_v, row) => row.itemUnitMasterConversion ?? '—'
		},
		{
			id: 'qtyRemaining',
			header: m.inv_common_remaining(),
			field: 'qtyRemaining',
			format: (_v, row) => {
				const t = row.qtyRemaining == null ? '' : String(row.qtyRemaining).trim();
				if (!t || t === '—') return '—';
				return formatPurchaseQtyCellWithIssueEquivalent(
					{ quantity: t, itemUnitMasterId: row.itemUnitMasterId, iumList: [] },
					cat
				);
			}
		},
		{
			id: 'quantity',
			header: m.inv_common_quantity(),
			field: 'quantity',
			format: (_v, row) =>
				formatPurchaseQtyCellWithIssueEquivalent(
					{
						quantity: row.quantity,
						itemUnitMasterId: row.itemUnitMasterId,
						iumList: []
					},
					cat
				)
		},
		{
			id: 'unitPrice',
			header: m.inv_po_line_unit_price(),
			field: 'unitPrice',
			format: (_v, row) => {
				const t = String(row.unitPrice ?? '').trim();
				return t ? trimInventoryNumericDisplay(t, 4) : '—';
			}
		},
		{
			id: 'manufacturerId',
			header: m.inv_common_manufacturer(),
			field: 'manufacturerId',
			widthClass: 'min-w-[10rem]',
			format: (_v, row) => poMfgLabelByPrLine[row.prLineId] ?? '—'
		}
	];
	});

</script>

	<DaisyUiCard>
		<DaisyUiCardBody>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					if (poCreateMode === 'manual') {
						void submitCreateManual();
					} else {
						void submitCreatePo();
					}
				}}
			>
				<fieldset class="m-0 min-w-0 border-0 p-0">
					<div class="mb-5 flex items-center gap-2">
						<DaisyUiTooltip
							tooltipText={m.inv_common_back_to_list()}
							className="d-tooltip-ghost d-tooltip-right"
						>
							<DaisyUiButton
								type="button"
								className="d-btn-sm d-btn-ghost d-btn-square"
								onClick={() => void goto(resolve(poListPath as any))}
							>
								<LucideArrowLeft className="size-4" />
							</DaisyUiButton>
						</DaisyUiTooltip>
						<DaisyUiCardBodyTitle className="mb-0">
							{poCreateMode === 'manual'
								? 'New purchase order (manual)'
								: m.inv_po_new_title()}
						</DaisyUiCardBodyTitle>
					</div>
				</fieldset>

				{#if poCreateMode === 'pr'}
				<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
					<fieldset class="m-0 min-w-0 flex-1 border-0 p-0">
						<div class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
							<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
								<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_po_select_pr()}</DaisyUiLabel>
								<div
									class="flex min-w-0 max-w-80 flex-1 flex-wrap items-stretch gap-2 sm:flex-nowrap"
								>
									<input
										type="text"
										readonly
										disabled
										class="d-input d-input-bordered min-w-0 flex-1 text-sm"
										value={selectedPrSummary || '—'}
										aria-label={m.inv_po_select_pr()}
									/>
									<DaisyUiButton
										type="button"
										className="d-btn-outline shrink-0"
										disabled={
											selectedInventoryFromStoreId == null || prPickerBusy
										}
										loading={prPickerBusy}
										onClick={() => void openPrPicker()}
									>
										{m.inv_common_btn_select()}
									</DaisyUiButton>
								</div>
							</div>
							<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
								<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_po_supplier_search()}</DaisyUiLabel>
								<div class="min-w-0 max-w-80 flex-1">
									<DaisyUISearchSelect
										value={supplierId != null ? String(supplierId) : ''}
										searchFn={async (q: string) => {
											const qEnc = encodeURIComponent(q.trim());
											const res = await fetch(
												`/api/heka/hospital/${hospitalId}/home/inventory-setup/supplier-setup?mode=search&q=${qEnc}&limit=30`
											);
											const j = await res.json();
											return (j ?? []).map((s: any) => ({
												label: s.name ?? '—',
												value: String(s.id)
											}));
										}}
										onChange={(v: string) => {
											if (v) {
												supplierId = Number(v);
											} else {
												supplierId = null;
											}
										}}
										placeholder="Search supplier..."
										className="d-input w-full"
									/>
								</div>
							</div>
						</div>
					</fieldset>
				</div>
				{#if prDetailForCreate}
					<p class="mb-3 text-sm text-base-content/80">
						<span class="opacity-70">{m.inv_pr_route()}</span>
						<strong
							>{prDetailForCreate.fromStoreName ?? '—'} → {prDetailForCreate.toStoreName ?? '—'}</strong
						>
					</p>
				{/if}
				{:else}
					<div class="mb-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
						<fieldset class="m-0 min-w-0 flex-1 border-0 p-0">
							<div class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
								<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
									<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_nav_from_store()}</DaisyUiLabel>
									<div class="min-w-0 max-w-80 flex-1">
										<input
											type="text"
											readonly
											disabled
											class="d-input d-input-bordered w-full text-sm"
											value={navFromStoreLabel}
											aria-label={m.inv_nav_from_store()}
										/>
										{#if selectedInventoryFromStoreId == null}
											<div class="mt-2 d-alert d-alert-warning text-sm" role="status">
												{m.inv_inventory_from_store_topbar_hint()}
											</div>
										{/if}
									</div>
								</div>
								<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
									<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_po_supplier_search()}</DaisyUiLabel>
									<div class="min-w-0 max-w-80 flex-1">
										<DaisyUISearchSelect
											value={supplierId != null ? String(supplierId) : ''}
											searchFn={async (q: string) => {
												const qEnc = encodeURIComponent(q.trim());
												const res = await fetch(
													`/api/heka/hospital/${hospitalId}/home/inventory-setup/supplier-setup?mode=search&q=${qEnc}&limit=30`
												);
												const j = await res.json();
												return (j ?? []).map((s: any) => ({
													label: s.name ?? '—',
													value: String(s.id)
												}));
											}}
											onChange={(v: string) => {
												if (v) {
													supplierId = Number(v);
												} else {
													supplierId = null;
												}
											}}
											placeholder="Search supplier..."
											className="d-input w-full"
										/>
									</div>
								</div>
							</div>
						</fieldset>
						<div
							class="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-3"
						>
							<DaisyUiTooltip tooltipText={m.inv_line_items_add()} className="d-tooltip-ghost">
								<DaisyUiButton
									type="button"
									className="d-btn-primary d-btn-square d-btn-outline"
									aria-label={m.inv_line_items_add()}
									onClick={() => void openManualLineDialogForCreate()}
								>
									<LucidePlus  />
								</DaisyUiButton>
							</DaisyUiTooltip>
							<DaisyUiButton
								type="submit"
								className="d-btn-primary"
								disabled={createSubmitting}
							>
								{m.inv_po_create_submit()}
							</DaisyUiButton>
						</div>
					</div>
					<PoManualLinesCard
						totalCount={manualLines.length}
						columns={manualLineTableColumns}
						rows={manualLines}
						useColumnFilters={true}
						hideAddButton={true}
						noCard={true}
						onAddItem={() => void openManualLineDialogForCreate()}
						onEditLine={(line) => void openManualLineDialogForEdit(line)}
						onDeleteLine={deleteManualLine}
					/>
				{/if}

				{#if poCreateMode === 'pr'}
					<h3 class="font-medium text-lg mt-6 mb-3">{m.inv_po_lines()}</h3>
					{#if prDetailForCreate && poLineDraft.length > 0}
						<div class="h-[420px] min-h-0 w-full">
							<MariTable
								columns={poCreateLineColumns}
								rows={poCreateLineRows}
								isLoading={false}
								showRowActions={true}
								actionsVariant="none"
								showRefreshButton={false}
								enableColumnFilters={false}
							>
								{#snippet rowActions(row)}
									<div class="flex flex-col items-center gap-1">
										<DaisyUiTooltip
											tooltipText={m.inv_line_items_tooltip_edit()}
											className="d-tooltip-accent d-tooltip-right"
										>
											<DaisyUiButton
												type="button"
												className="d-btn-sm d-btn-ghost d-btn-square text-accent"
												onClick={() => void openPoPrLineDialog(row.prLineId)}
											>
												<LucidePencil className="size-5" />
											</DaisyUiButton>
										</DaisyUiTooltip>
										<DaisyUiTooltip
											tooltipText={m.inv_common_remove_line()}
											className="d-tooltip-error d-tooltip-right"
										>
											<DaisyUiButton
												type="button"
												className="d-btn-sm d-btn-ghost d-btn-square text-error"
												onClick={() => removePoPrLine(row.prLineId)}
											>
												<LucideTrash2 className="size-5" />
											</DaisyUiButton>
										</DaisyUiTooltip>
									</div>
								{/snippet}
							</MariTable>
						</div>
					{:else if prDetailForCreate && selectedPrId && poLineDraft.length === 0}
						<div
							class="rounded-box border border-dashed border-base-300 bg-base-200/30 px-4 py-3 text-sm text-base-content/80"
						>
							All lines were removed. Reselect the PR to restore lines from the requisition, or
							choose a different PR.
						</div>
					{:else}
						<div class="d-alert d-alert-warning text-sm" role="status">
							{m.inv_po_new_lines_need_pr_hint()}
						</div>
					{/if}
				{/if}

				{#if poCreateMode === 'pr'}
					<DaisyUiCardBodyAction className="mt-8 flex flex-wrap gap-3 border-t border-base-200 pt-6">
						<DaisyUiButton
							type="submit"
							className="d-btn-wide d-btn-primary"
							disabled={createSubmitting}
						>
							{m.inv_po_create_submit()}
						</DaisyUiButton>
					</DaisyUiCardBodyAction>
				{/if}
			</form>
		</DaisyUiCardBody>
	</DaisyUiCard>
