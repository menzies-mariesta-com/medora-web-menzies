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
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import PoManualLineModal from '$lib/component/own/local/private/heka/inventory/purchase-order/PoManualLineModal.svelte';
	import PoManualLinesCard from '$lib/component/own/local/private/heka/inventory/purchase-order/PoManualLinesCard.svelte';
	import PoPrLineEditModal from '$lib/component/own/local/private/heka/inventory/purchase-order/PoPrLineEditModal.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import InventoryTableTextCell from '$lib/component/own/local/private/heka/inventory/InventoryTableTextCell.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';
	import { m } from '$lib/paraglide/messages';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { hekaHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import {
		InvApprovalActionEnum,
		InvPoStatusTaggingEnum,
		InvPrStatusTaggingEnum
	} from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);
	const detailId = $derived(page.url.searchParams.get('id') ?? '');
	const poListPath = $derived(
		hekaHospitalPageUrl(hospitalId, '/heka/home/inventory/purchase-order' as any)
	);

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
		createdAt?: string | null;
		updatedAt?: string | null;
		approvedByName?: string | null;
	};

	type PoLine = {
		id: number;
		prLineId: number | null;
		itemId: number;
		quantity: string;
		unitId: number;
		unitPrice: string;
		lineTotal: string;
		manufacturerId: number | null;
		qtyReceivedCumulative: string;
		itemName?: string | null;
		isBatchRequired?: boolean;
		/** From `getPurchaseOrderById`: Item Unit Master + conversion label. */
		itemUnitMasterId?: number | null;
		itemUnitMasterConversion?: string | null;
	};

	type LogRow = {
		id: number;
		level: number;
		action: number;
		remarks: string | null;
		approvedBy: string;
		approvedByName?: string | null;
		createdAt: string;
	};

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

	type PoDetail = {
		id: string;
		poNo?: string | null;
		prId: string | null;
		supplierId: number;
		supplierName?: string | null;
		storeName?: string | null;
		statusTaggingId: number;
		statusName?: string | null;
		currentLevel: number;
		totalAmount: string;
		lines: PoLine[];
		logs: LogRow[];
	};

	let viewMode = $state<'list' | 'create'>('list');
	/** When viewMode is create, whether lines come from a PR or are freeform. */
	let poCreateMode = $state<'pr' | 'manual'>('pr');

	let list = $state<PoRow[]>([]);
	let loading = $state(false);

	let detail = $state<PoDetail | null>(null);
	let detailLoading = $state(false);
	let remarks = $state('');
	let lineQtyDraft = $state<Record<number, string>>({});
	let linePriceDraft = $state<Record<number, string>>({});
	let baselineQty = $state<Record<number, string>>({});
	let baselinePrice = $state<Record<number, string>>({});

	let approvedPrList = $state<
		{ id: string; storeName: string | null; prNo?: string | null }[]
	>([]);
	let selectedPrId = $state<string | null>(null);
	let prDetailForCreate = $state<{
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
	let supplierQuery = $state('');
	let supplierHits = $state<{ id: number; name: string | null }[]>([]);
	let supplierId = $state<number | null>(null);
	let supplierLabel = $state('');
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

	type IumOpt = {
		id: number;
		purchaseUnitId: number;
		issueUnitId: number;
		conversionDisplay: string;
		purchaseUnitName: string;
		issueUnitName: string;
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

	let storeOptions = $state<{ id: number; name: string | null }[]>([]);
	let manualStoreId = $state<number | null>(null);
	let manualLines = $state<ManualLineForm[]>([]);

	let manualLineItemFilter = $state('');
	let manualLineDialogOpen = $state(false);
	let editingManualKey = $state<string | null>(null);
	let draftManualLine = $state<ManualLineForm>(newManualLine());
	let manualLineDialogSubmitting = $state(false);

	let poPrLineDialogOpen = $state(false);
	let poPrLineDialogSubmitting = $state(false);
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

	const filteredManualLines = $derived.by(() => {
		const q = manualLineItemFilter.trim().toLowerCase();
		if (!q) return manualLines;
		return manualLines.filter((l) => {
			const item = (l.itemLabel ?? '').toLowerCase();
			const conv = conversionLabelForManualLine(l).toLowerCase();
			const qty = (l.quantity ?? '').toLowerCase();
			const up = (l.unitPrice ?? '').toLowerCase();
			const mfg = (manualMfgLabelByKey[l.key] ?? '').toLowerCase();
			return (
				item.includes(q) || conv.includes(q) || qty.includes(q) || up.includes(q) || mfg.includes(q)
			);
		});
	});

	const manualLineTableColumns: MariTableColumn<ManualLineForm>[] = [
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
			format: (_v, row) => conversionLabelForManualLine(row)
		},
		{
			id: 'quantity',
			header: m.inv_common_quantity(),
			field: 'quantity',
			filterable: false,
			format: (_v, row) => row.quantity?.trim() || '—'
		},
		{
			id: 'unitPrice',
			header: m.inv_po_line_unit_price(),
			field: 'unitPrice',
			filterable: false,
			format: (_v, row) => row.unitPrice?.trim() || '—'
		},
		{
			id: 'manufacturerId',
			header: m.inv_common_manufacturer(),
			field: 'manufacturerId',
			filterable: false,
			format: (_v, row) => manualMfgLabelByKey[row.key] ?? (row.manufacturerId?.trim() ? '…' : '—')
		}
	];

	function openManualLineDialogForCreate() {
		editingManualKey = null;
		draftManualLine = newManualLine();
		manualLineDialogOpen = true;
	}

	function openManualLineDialogForEdit(line: ManualLineForm) {
		editingManualKey = line.key;
		draftManualLine = {
			...line,
			hits: [...line.hits],
			iumList: [...line.iumList]
		};
		manualLineDialogOpen = true;
	}

	function closeManualLineDialog() {
		manualLineDialogOpen = false;
		editingManualKey = null;
		manualLineDialogSubmitting = false;
	}

	async function pickDraftManualItem(itemId: number) {
		await hydrateManualLineItem(draftManualLine, itemId);
		draftManualLine = { ...draftManualLine };
	}

	function saveManualDraftLine() {
		const unitId = purchaseUnitForManual(draftManualLine);
		if (draftManualLine.itemId == null || unitId == null) {
			toastService.addErrorToast(
				'Could not save line',
				'Select an item and a purchase unit conversion.'
			);
			return;
		}
		const q = draftManualLine.quantity.trim();
		const p = draftManualLine.unitPrice.trim();
		if (!q || !Number.isFinite(Number(q)) || Number(q) <= 0) {
			toastService.addErrorToast('Could not save line', 'Enter a valid quantity greater than 0.');
			return;
		}
		if (!Number.isFinite(Number(p)) || Number(p) < 0) {
			toastService.addErrorToast('Could not save line', 'Enter a valid unit price.');
			return;
		}
		manualLineDialogSubmitting = true;
		try {
			const saved = { ...draftManualLine, quantity: q, unitPrice: p };
			if (editingManualKey) {
				manualLines = manualLines.map((l) => (l.key === editingManualKey ? saved : l));
			} else {
				manualLines = [...manualLines, saved];
			}
			closeManualLineDialog();
		} finally {
			manualLineDialogSubmitting = false;
		}
	}

	function deleteManualLine(lineKey: string) {
		manualLines = manualLines.filter((l) => l.key !== lineKey);
	}

	function openPoPrLineDialog(prLineId: number) {
		const row = poLineDraft.find((r) => r.prLineId === prLineId);
		if (!row) return;
		draftPoPrLine = {
			prLineId: row.prLineId,
			quantity: row.quantity,
			unitPrice: row.unitPrice,
			manufacturerId: row.manufacturerId
		};
		poPrLineDialogOpen = true;
	}

	function closePoPrLineDialog() {
		poPrLineDialogOpen = false;
		draftPoPrLine = null;
		poPrLineDialogSubmitting = false;
	}

	function savePoPrLineDraft() {
		if (!draftPoPrLine) return;
		const q = draftPoPrLine.quantity.trim();
		const p = draftPoPrLine.unitPrice.trim();
		if (!q || !Number.isFinite(Number(q)) || Number(q) <= 0) {
			toastService.addErrorToast('Could not save line', 'Enter a valid quantity greater than 0.');
			return;
		}
		if (!Number.isFinite(Number(p)) || Number(p) < 0) {
			toastService.addErrorToast('Could not save line', 'Enter a valid unit price.');
			return;
		}
		poPrLineDialogSubmitting = true;
		try {
			patchPoCreateLine(draftPoPrLine.prLineId, {
				quantity: q,
				unitPrice: p,
				manufacturerId: draftPoPrLine.manufacturerId.trim()
			});
			closePoPrLineDialog();
		} finally {
			poPrLineDialogSubmitting = false;
		}
	}

	function removePoPrLine(prLineId: number) {
		poLineDraft = poLineDraft.filter((r) => r.prLineId !== prLineId);
	}

	async function loadStoreOptions() {
		if (!hospitalId) return;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/stores?pageSize=500`,
			{ method: 'GET' }
		);
		if (!res.ok) return;
		const j = (await res.json()) as { data: { id: number; storeName: string | null }[] };
		storeOptions = (j.data ?? []).map((r) => ({
			id: r.id,
			name: r.storeName
		}));
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

	function actionLabel(a: number): string {
		if (a === InvApprovalActionEnum.APPROVED) return m.inv_approval_action_approved();
		if (a === InvApprovalActionEnum.REJECTED) return m.inv_approval_action_rejected();
		if (a === InvApprovalActionEnum.SENT_BACK) return m.inv_approval_action_sent_back();
		return String(a);
	}

	function syncPoLineDrafts(d: PoDetail) {
		const q: Record<number, string> = {};
		const p: Record<number, string> = {};
		const bq: Record<number, string> = {};
		const bp: Record<number, string> = {};
		for (const ln of d.lines) {
			q[ln.id] = String(ln.quantity);
			p[ln.id] = String(ln.unitPrice);
			bq[ln.id] = String(ln.quantity);
			bp[ln.id] = String(ln.unitPrice);
		}
		lineQtyDraft = q;
		linePriceDraft = p;
		baselineQty = bq;
		baselinePrice = bp;
	}

	async function loadList() {
		if (!hospitalId) return;
		loading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order?pageSize=${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`,
				{ method: 'GET' }
			);
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as { data: PoRow[] };
			list = j.data ?? [];
		} catch (e) {
			toastService.addErrorToast('Could not load purchase orders', e);
		} finally {
			loading = false;
		}
	}

	async function loadDetail() {
		if (!hospitalId || !detailId) {
			detail = null;
			return;
		}
		detailLoading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order?id=${encodeURIComponent(detailId)}`,
				{ method: 'GET' }
			);
			if (!res.ok) throw new Error(String(res.status));
			const j = (await res.json()) as PoDetail | null;
			detail = j;
			if (j) syncPoLineDrafts(j);
		} catch (e) {
			toastService.addErrorToast('Could not load purchase order detail', e);
		} finally {
			detailLoading = false;
		}
	}

	function buildPoAdjustments():
		| { lineId: number; quantity: string; unitPrice?: string }[]
		| undefined {
		if (!detail) return undefined;
		const adj: { lineId: number; quantity: string; unitPrice?: string }[] = [];
		for (const ln of detail.lines) {
			const dq = (lineQtyDraft[ln.id] ?? '').trim();
			const dp = (linePriceDraft[ln.id] ?? '').trim();
			const oq = baselineQty[ln.id] ?? String(ln.quantity);
			const op = baselinePrice[ln.id] ?? String(ln.unitPrice);
			if (dq && dq !== oq) {
				const row: { lineId: number; quantity: string; unitPrice?: string } = {
					lineId: ln.id,
					quantity: dq
				};
				if (dp && dp !== op) row.unitPrice = dp;
				adj.push(row);
			} else if (dp && dp !== op) {
				adj.push({ lineId: ln.id, quantity: oq, unitPrice: dp });
			}
		}
		return adj.length ? adj : undefined;
	}

	async function act(action: number) {
		if (!hospitalId || !detail) return;
		detailLoading = true;
		try {
			const lineAdjustments =
				action === InvApprovalActionEnum.APPROVED ? buildPoAdjustments() : undefined;
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order/approve`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						poId: detail.id,
						action,
						remarks: remarks.trim() || null,
						...(lineAdjustments ? { lineAdjustments } : {})
					})
				}
			);
			if (!res.ok) {
				const t = await res.text();
				toastService.addErrorToast('Could not update purchase order', t || String(res.status));
				return;
			}
			const j = (await res.json()) as PoDetail;
			detail = j;
			syncPoLineDrafts(j);
			remarks = '';
		} catch (e) {
			toastService.addErrorToast('Could not update purchase order', e);
		} finally {
			detailLoading = false;
		}
	}

	async function resubmitPo() {
		if (!hospitalId || !detail) return;
		detailLoading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order/resubmit`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ poId: detail.id })
				}
			);
			if (!res.ok) {
				const t = await res.text();
				toastService.addErrorToast('Could not resubmit purchase order', t || String(res.status));
				return;
			}
			const j = (await res.json()) as PoDetail;
			detail = j;
			syncPoLineDrafts(j);
		} catch (e) {
			toastService.addErrorToast('Could not resubmit purchase order', e);
		} finally {
			detailLoading = false;
		}
	}

	async function sendToSupplier() {
		if (!hospitalId || !detail) return;
		detailLoading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order/send`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ poId: detail.id })
				}
			);
			if (!res.ok) {
				const t = await res.text();
				toastService.addErrorToast('Could not send purchase order to supplier', t || String(res.status));
				return;
			}
			const j = (await res.json()) as PoDetail;
			detail = j;
			syncPoLineDrafts(j);
		} catch (e) {
			toastService.addErrorToast('Could not send purchase order to supplier', e);
		} finally {
			detailLoading = false;
		}
	}

	async function loadApprovedPrs() {
		if (!hospitalId) return;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition?statusTaggingId=${InvPrStatusTaggingEnum.APPROVED}&pageSize=${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`,
			{ method: 'GET' }
		);
		const j = (await res.json()) as {
			data: { id: string; storeName: string | null; prNo?: string | null }[];
		};
		approvedPrList = j.data ?? [];
	}



	async function onSelectPr(pr: string | null) {
		selectedPrId = pr;
		prDetailForCreate = null;
		poLineDraft = [];
		if (!hospitalId || !pr) return;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory/purchase-requisition?id=${encodeURIComponent(pr)}`,
			{ method: 'GET' }
		);
		const j = (await res.json()) as {
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
		prDetailForCreate = { lines: j.lines ?? [] };
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
		if (!hospitalId || manualStoreId == null || supplierId == null) {
			toastService.addErrorToast(
				'Could not create purchase order',
				'Store and supplier are required.'
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
						storeId: manualStoreId,
						supplierId,
						lines
					})
				}
			);
			if (!res.ok) {
				toastService.addErrorToast('Could not create purchase order', await res.text());
				return;
			}
			const created = (await res.json()) as PoDetail;
			viewMode = 'list';
			manualLines = [];
			manualStoreId = null;
			poCreateMode = 'pr';
			supplierId = null;
			await loadList();
			if (created?.id) {
				// @ts-expect-error
				await goto(resolve(`${poListPath}`) + `?id=${encodeURIComponent(created.id)}`);
			}
		} catch (e) {
			toastService.addErrorToast('Could not create purchase order', e);
		} finally {
			createSubmitting = false;
		}
	}

	async function submitCreatePo() {
		if (!hospitalId || !selectedPrId || supplierId == null) {
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
			const created = (await res.json()) as PoDetail;
			viewMode = 'list';
			selectedPrId = null;
			prDetailForCreate = null;
			poLineDraft = [];
			supplierId = null;
			supplierLabel = '';
			await loadList();
			if (created?.id) {
				// @ts-expect-error
				await goto(resolve(`${poListPath}`) + `?id=${encodeURIComponent(created.id)}`);
			}
		} catch (e) {
			toastService.addErrorToast('Could not create purchase order', e);
		} finally {
			createSubmitting = false;
		}
	}

	function openCreate() {
		poCreateMode = 'pr';
		viewMode = 'create';
		void loadApprovedPrs();
	}

	function openCreateManual() {
		poCreateMode = 'manual';
		viewMode = 'create';
		manualStoreId = null;
		manualLines = [];
		manualLineItemFilter = '';
		supplierId = null;
		void loadStoreOptions();
	}

	$effect(() => {
		void hospitalId;
		void loadList();
	});

	$effect(() => {
		void detailId;
		void hospitalId;
		void loadDetail();
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

	const poCreateLineColumns = $derived.by((): MariTableColumn<PoCreateLineTableRow>[] => [
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
			cellClass: 'whitespace-normal align-top text-sm',
			filterable: false,
			format: (_v, row) => row.itemUnitMasterConversion ?? '—'
		},
		{
			id: 'qtyRemaining',
			header: m.inv_common_remaining(),
			field: 'qtyRemaining',
			format: (_v, row) => row.qtyRemaining
		},
		{
			id: 'quantity',
			header: m.inv_common_quantity(),
			field: 'quantity',
			format: (_v, row) => row.quantity?.trim() || '—'
		},
		{
			id: 'unitPrice',
			header: m.inv_po_line_unit_price(),
			field: 'unitPrice',
			format: (_v, row) => row.unitPrice?.trim() || '—'
		},
		{
			id: 'manufacturerId',
			header: m.inv_common_manufacturer(),
			field: 'manufacturerId',
			widthClass: 'min-w-[10rem]',
			format: (_v, row) => poMfgLabelByPrLine[row.prLineId] ?? '—'
		}
	]);

	const poDetailLineColumns = $derived.by((): MariTableColumn<PoLine>[] => {
		const pending = detail?.statusTaggingId === InvPoStatusTaggingEnum.PENDING;
		const qtyCol: MariTableColumn<PoLine> = pending
			? {
					id: 'quantity',
					header: m.inv_common_quantity(),
					field: 'quantity',
					cellComponentGetter: (row) => ({
						component: InventoryTableTextCell,
						props: {
							value: lineQtyDraft[row.id] ?? String(row.quantity),
							onValueChange: (v: string) => {
								lineQtyDraft[row.id] = v;
								lineQtyDraft = { ...lineQtyDraft };
							}
						}
					})
				}
			: {
					id: 'quantity',
					header: m.inv_common_quantity(),
					field: 'quantity',
					format: (_v, row) => row.quantity
				};
		const priceCol: MariTableColumn<PoLine> = pending
			? {
					id: 'unitPrice',
					header: m.inv_po_line_unit_price(),
					field: 'unitPrice',
					cellComponentGetter: (row) => ({
						component: InventoryTableTextCell,
						props: {
							value: linePriceDraft[row.id] ?? String(row.unitPrice),
							onValueChange: (v: string) => {
								linePriceDraft[row.id] = v;
								linePriceDraft = { ...linePriceDraft };
							}
						}
					})
				}
			: {
					id: 'unitPrice',
					header: m.inv_po_line_unit_price(),
					field: 'unitPrice',
					format: (_v, row) => row.unitPrice
				};
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
				cellClass: 'whitespace-normal align-top text-sm',
				filterable: false,
				format: (_v, row) => row.itemUnitMasterConversion ?? '—'
			},
			qtyCol,
			priceCol,
			{
				id: 'lineTotal',
				header: m.inv_po_line_total(),
				field: 'lineTotal',
				format: (_v, row) => row.lineTotal
			},
			{
				id: 'qtyReceivedCumulative',
				header: `${m.inv_grn_line_received_qty()} Σ`,
				field: 'qtyReceivedCumulative',
				format: (_v, row) => row.qtyReceivedCumulative
			},
			{
				id: 'batch',
				header: 'Batch?',
				field: 'isBatchRequired',
				format: (_v, row) => (row.isBatchRequired ? 'Y' : '—')
			}
		];
	});

	const poLogColumns: MariTableColumn<LogRow>[] = [
		{
			id: 'createdAt',
			header: m.inv_pr_approve_log_at(),
			field: 'createdAt',
			widthClass: 'w-40',
			format: (v) => String(v ?? '')
		},
		{
			id: 'level',
			header: m.inv_pr_approve_log_level(),
			field: 'level',
			widthClass: 'w-24',
			format: (_v, row) => String(row.level)
		},
		{
			id: 'action',
			header: m.inv_pr_approve_log_action(),
			field: 'action',
			widthClass: 'w-32',
			format: (_v, row) => actionLabel(row.action)
		},
		{
			id: 'remarks',
			header: m.inv_common_remarks(),
			field: 'remarks',
			format: (_v, row) => row.remarks ?? '—'
		},
		{
			id: 'by',
			header: m.inv_pr_approve_log_by(),
			field: 'approvedByName',
			widthClass: TableRowEnum.FULL_NAME_COLUMN_WIDTH,
			format: (_v, row) => row.approvedByName ?? row.approvedBy ?? '—'
		}
	];

	const columns: MariTableColumn<PoRow>[] = [
		{
			id: 'poNo',
			header: m.inv_po_no(),
			field: 'poNo',
			format: (_v, row) => row.poNo ?? '—'
		},
		{
			id: 'storeName',
			header: m.inv_common_store(),
			field: 'storeName',
			format: (v, row) => row.storeName ?? '—'
		},
		{
			id: 'supplierName',
			header: m.inv_po_select_supplier(),
			field: 'supplierName',
			format: (v, row) => row.supplierName ?? '—'
		},
		{
			id: 'statusName',
			header: m.status(),
			field: 'statusName'
		},
		{
			id: 'totalAmount',
			header: m.inv_po_line_total(),
			field: 'totalAmount'
		},
		{
			id: 'approvedByName',
			header: m.inv_common_approved_by(),
			field: 'approvedByName',
			widthClass: TableRowEnum.FULL_NAME_COLUMN_WIDTH,
			format: (v, row) => row.approvedByName ?? '—'
		}
	];
</script>

{#if detailId}
	<DaisyUiCard>
		<DaisyUiCardBody>
			<div class="mb-4">
				<a class="d-btn d-btn-sm d-btn-ghost d-btn-outline" href={resolve(poListPath as any)}>
					{m.inv_common_back_to_list()}
				</a>
			</div>
			<DaisyUiCardBodyTitle className="mb-4">
				{m.inv_po_detail_title()}
			</DaisyUiCardBodyTitle>
			{#if detailLoading && !detail}
				<p class="text-sm opacity-70">{m.loading()}</p>
			{:else if detail}
				<div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2 text-sm bg-base-200 p-4 rounded-lg">
						<div class="flex flex-col gap-1">
							<div class="flex justify-between border-b border-base-300 pb-1">
								<span class="opacity-70">{m.inv_po_no()}:</span>
								<strong class="font-medium text-right">{detail.poNo ?? '—'}</strong>
							</div>
							<div class="flex justify-between border-b border-base-300 pb-1">
								<span class="opacity-70">{m.status()}:</span>
								<strong class="font-medium text-right text-primary">{detail.statusName ?? '—'}</strong>
							</div>
							<div class="flex justify-between border-b border-base-300 pb-1">
								<span class="opacity-70">{m.inv_common_level()}:</span>
								<strong class="font-medium text-right">{detail.currentLevel}</strong>
							</div>
							<div class="flex justify-between border-b border-base-300 pb-1">
								<span class="opacity-70">{m.inv_common_store()}:</span>
								<strong class="font-medium text-right">{detail.storeName ?? '—'}</strong>
							</div>
							<div class="flex justify-between border-b border-base-300 pb-1">
								<span class="opacity-70">PR</span>
								<strong class="font-medium text-right"
									>{detail.prId ? 'Linked' : '—'}</strong
								>
							</div>
							<div class="flex justify-between pb-1">
								<span class="opacity-70">{m.inv_po_select_supplier()}:</span>
								<strong class="font-medium text-right">{detail.supplierName ?? '—'}</strong>
							</div>
						</div>
					</div>
					<div class="flex flex-col justify-end space-y-4">
						<div class="p-4 bg-primary/10 rounded-lg text-primary text-right mb-2">
							<span class="opacity-80 text-xs uppercase font-semibold tracking-wider block mb-1">{m.inv_po_line_unit_price()} Total</span>
							<span class="text-2xl font-bold">{detail.totalAmount}</span>
						</div>
						<div class="space-y-1">
							<DaisyUiLabel>{m.inv_common_remarks()}</DaisyUiLabel>
							<textarea
								class="d-textarea d-textarea-bordered w-full resize-none h-[48px]"
								bind:value={remarks}
							></textarea>
						</div>
					</div>
				</div>

				{#if detail.statusTaggingId === InvPoStatusTaggingEnum.PENDING}
					<div class="flex flex-wrap gap-2 mb-6 p-4 border border-base-200 rounded-lg bg-base-100/50">
						<DaisyUiButton
							className="d-btn-primary"
							disabled={detailLoading}
							onClick={() => act(InvApprovalActionEnum.APPROVED)}
						>
							{m.inv_btn_approve()}
						</DaisyUiButton>
						<DaisyUiButton
							className="d-btn-error d-btn-outline"
							disabled={detailLoading}
							onClick={() => act(InvApprovalActionEnum.REJECTED)}
						>
							{m.inv_btn_reject()}
						</DaisyUiButton>
						<DaisyUiButton
							className="d-btn-warning d-btn-outline"
							disabled={detailLoading}
							onClick={() => act(InvApprovalActionEnum.SENT_BACK)}
						>
							{m.inv_btn_send_back()}
						</DaisyUiButton>
					</div>
				{:else if detail.statusTaggingId === InvPoStatusTaggingEnum.REJECTED || detail.statusTaggingId === InvPoStatusTaggingEnum.SENT_BACK}
					<div class="mb-6">
						<DaisyUiButton
							className="d-btn-outline d-btn-primary"
							disabled={detailLoading}
							onClick={() => resubmitPo()}
						>
							{m.inv_po_resubmit()}
						</DaisyUiButton>
					</div>
				{:else if detail.statusTaggingId === InvPoStatusTaggingEnum.APPROVED}
					<div class="mb-6">
						<DaisyUiButton
							className="d-btn-primary"
							disabled={detailLoading}
							onClick={() => sendToSupplier()}
						>
							{m.inv_po_send_supplier()}
						</DaisyUiButton>
					</div>
				{/if}

				<h2 class="font-semibold text-lg mb-3 mt-4 text-base-content/90">{m.inv_po_lines()}</h2>
				<div class={`${TableEnum.HEIGHT} min-w-0 mb-8`}>
					<MariTable
						columns={poDetailLineColumns}
						rows={detail.lines}
						isLoading={false}
				showRefreshButton={true}
				refreshTooltip={m.refresh_data()}
				on:refresh={() => loadDetail()}
					/>
				</div>

				<h2 class="font-semibold text-lg mb-3 mt-4 text-base-content/90">{m.inv_po_logs()}</h2>
				<div class={TableEnum.HEIGHT}>
					<MariTable
						columns={poLogColumns}
						rows={detail.logs}
						isLoading={false}
				showRefreshButton={true}
				refreshTooltip={m.refresh_data()}
				on:refresh={() => loadDetail()}
						emptyMessage="No logs found"
					/>
				</div>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
{:else if viewMode === 'list'}
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-lg font-semibold">{m.inv_page_po_title()}</h1>
		<div class="flex flex-wrap gap-2">
			<DaisyUiButton className="d-btn-primary" onClick={openCreate}>
				<LucidePlus className="size-4" />
				{m.inv_po_new_title()}
			</DaisyUiButton>
			<DaisyUiButton
				className="d-btn-outline"
				onClick={openCreateManual}
			>
				<LucidePlus className="size-4" />
				<span>Manual (no PR)</span>
			</DaisyUiButton>
		</div>
	</div>

	<div class={TableEnum.HEIGHT}>
		<MariTable
			{columns}
			rows={list}
			isLoading={loading}
			showRowActions={true}
			actionsVariant="none"
			showRefreshButton={true}
			refreshTooltip={m.refresh_data()}
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
							onClick={() => {
								// @ts-expect-error
								const url = resolve(poListPath) + '?id=' + encodeURIComponent(row.id);
								window.location.href = url;
							}}
						>
							<LucideEye className="size-5" />
						</DaisyUiButton>
					</DaisyUiTooltip>
				</div>
			{/snippet}
		</MariTable>
	</div>
{:else}
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
					<DaisyUiCardBodyTitle className="mb-5">
						{poCreateMode === 'manual'
							? 'New purchase order (manual)'
							: m.inv_po_new_title()}
					</DaisyUiCardBodyTitle>
				</fieldset>
				
				{#if poCreateMode === 'pr'}
				<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
					<fieldset class="m-0 min-w-0 flex-1 border-0 p-0">
						<div class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
							<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
								<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_po_select_pr()}</DaisyUiLabel>
								<div class="min-w-0 max-w-80 flex-1">
									<DaisyUISearchSelect
										value={selectedPrId ?? ''}
										options={approvedPrList.map((pr) => ({
											label: `${pr.prNo ?? '—'} · ${pr.storeName ?? '—'}`,
											value: pr.id
										}))}
										onChange={(v: string) => onSelectPr(v || null)}
										placeholder="Select a PR..."
										className="w-full text-base-content"
									/>
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
				{:else}
					<div class="mb-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
						<fieldset class="m-0 min-w-0 flex-1 border-0 p-0">
							<div class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
								<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
									<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_common_store()}</DaisyUiLabel>
									<div class="min-w-0 max-w-80 flex-1">
										<DaisyUISearchSelect
											value={manualStoreId != null ? String(manualStoreId) : ''}
											options={storeOptions.map((s) => ({
												label: s.name ?? `Store #${s.id}`,
												value: String(s.id)
											}))}
											onChange={(v: string) => {
												manualStoreId = v ? Number(v) : null;
											}}
											placeholder="Select store (approval context)…"
											className="w-full"
										/>
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
					<PoManualLinesCard
						bind:manualLineItemFilter
						totalCount={manualLines.length}
						columns={manualLineTableColumns}
						rows={filteredManualLines}
						onAddItem={openManualLineDialogForCreate}
						onEditLine={openManualLineDialogForEdit}
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
											tooltipText="Edit"
											className="d-tooltip-accent d-tooltip-right"
										>
											<DaisyUiButton
												type="button"
												className="d-btn-sm d-btn-ghost d-btn-accent"
												onClick={() => openPoPrLineDialog(row.prLineId)}
											>
												<LucidePencil className="size-5" />
											</DaisyUiButton>
										</DaisyUiTooltip>
										<DaisyUiTooltip
											tooltipText="Remove"
											className="d-tooltip-error d-tooltip-right"
										>
											<DaisyUiButton
												type="button"
												className="d-btn-ghost d-btn-sm d-btn-error"
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
						<div
							class="rounded-box border border-dashed border-base-300 bg-base-200/30 px-4 py-3 text-sm text-base-content/80"
						>
							{m.inv_po_new_lines_need_pr_hint()}
						</div>
					{/if}
				{/if}

				<PoManualLineModal
					open={manualLineDialogOpen}
					editing={Boolean(editingManualKey)}
					submitting={manualLineDialogSubmitting}
					bind:draftManualLine
					searchItemsFn={searchItemsForManual}
					searchManufacturersFn={searchManufacturers}
					getManufacturerLabelForValue={getManufacturerLabelForValue}
					onPickItem={pickDraftManualItem}
					onClose={closeManualLineDialog}
					onSave={saveManualDraftLine}
				/>

				<PoPrLineEditModal
					open={poPrLineDialogOpen}
					submitting={poPrLineDialogSubmitting}
					bind:draftPoPrLine
					searchManufacturersFn={searchManufacturers}
					getManufacturerLabelForValue={getManufacturerLabelForValue}
					onClose={closePoPrLineDialog}
					onSave={savePoPrLineDraft}
				/>

				<DaisyUiCardBodyAction className="mt-8 flex flex-wrap gap-3 border-t border-base-200 pt-6">
					<DaisyUiButton
						type="submit"
						className="d-btn-wide d-btn-primary"
						disabled={createSubmitting}
					>
						{m.inv_po_create_submit()}
					</DaisyUiButton>
					<DaisyUiButton
						type="button"
						className="d-btn-outline d-btn-wide"
						onClick={() => {
							viewMode = 'list';
						}}
					>
						{m.inv_common_back_to_list()}
					</DaisyUiButton>
				</DaisyUiCardBodyAction>
			</form>
		</DaisyUiCardBody>
	</DaisyUiCard>
{/if}
