<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCardBodyAction from '$lib/component/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MariTable, { type MariTableColumn } from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';
	import { m } from '$lib/paraglide/messages';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { InvPoStatusTaggingEnum } from '$lib/model/enum/db-link';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? page.params.hospital_id : ''
	);

	const toastService = new ToastService();

	type GrnRow = {
		id: string;
		poId: string | null;
		storeId: number;
		storeName?: string | null;
		supplierName?: string | null;
		receivedDate: string;
		statusTaggingId: number;
		statusName?: string | null;
		createdAt?: string | null;
		updatedAt?: string | null;
		receivedByName?: string | null;
		cancelledAt?: string | null;
	};

	type GrnLineTableRow = {
		id: number;
		poLineId: number;
		receivedQty: string;
		batchNo: string;
		expiryDate: string;
		purchasePrice: string;
		itemName: string | null;
		isBatchRequired: boolean;
		itemUnitMasterId: number | null;
		itemUnitMasterConversion: string | null;
	};

	type PoLine = {
		id: number;
		itemId: number;
		quantity: string;
		unitId: number;
		unitPrice: string;
		qtyReceivedCumulative: string;
		itemName?: string | null;
		isBatchRequired?: boolean;
		itemUnitMasterId?: number | null;
		itemUnitMasterConversion?: string | null;
	};

	type ReceivingStore = { storeId: number; storeName: string | null } | null;

	type PoRowLite = {
		id: string;
		poNo?: string | null;
		statusTaggingId: number;
		statusName: string | null;
		supplierName?: string | null;
	};

	let viewMode = $state<'list' | 'create'>('list');
	let grnFormMode = $state<'fromPo' | 'direct'>('fromPo');

	let list = $state<GrnRow[]>([]);
	let listLoading = $state(false);

	let poList = $state<PoRowLite[]>([]);
	let selectedPoId = $state<string | null>(null);
	let receivingStore = $state<ReceivingStore>(null);
	/** Set when PO is selected but API returns null or error (e.g. no central store). */
	let receivingStoreHint = $state<string | null>(null);
	let receivedDate = $state(new Date().toISOString().slice(0, 10));
	let poLines = $state<PoLine[]>([]);
	let lineForms = $state<
		{
			poLineId: number;
			receivedQty: string;
			batchNo: string;
			expiryDate: string;
			purchasePrice: string;
		}[]
	>([]);

	let submitting = $state(false);

	type IumOpt = {
		id: number;
		purchaseUnitId: number;
		issueUnitId: number;
		conversionDisplay: string;
		purchaseUnitName: string;
		issueUnitName: string;
	};

	type GrnDirectLine = {
		key: string;
		itemSearch: string;
		hits: { id: number; name: string | null }[];
		itemId: number | null;
		itemLabel: string;
		receivedQty: string;
		batchNo: string;
		expiryDate: string;
		purchasePrice: string;
		iumList: IumOpt[];
		itemUnitMasterId: number | null;
		isBatchRequired?: boolean;
	};

	let storeOptions = $state<{ id: number; name: string | null }[]>([]);
	let directStoreId = $state<number | null>(null);
	let directSupplierId = $state<number | null>(null);
	let directLines = $state<GrnDirectLine[]>([]);

	let directLineItemFilter = $state('');
	let directLineDialogOpen = $state(false);
	let editingDirectKey = $state<string | null>(null);
	let draftDirectLine = $state<GrnDirectLine>(newDirectLine());
	let directLineDialogSubmitting = $state(false);

	let grnLineItemFilter = $state('');
	let grnFromPoLineDialogOpen = $state(false);
	let grnFromPoLineDialogSubmitting = $state(false);
	let draftGrnFromPoLine = $state<{
		poLineId: number;
		receivedQty: string;
		batchNo: string;
		expiryDate: string;
		purchasePrice: string;
	} | null>(null);

	function newDirectLine(): GrnDirectLine {
		return {
			key: crypto.randomUUID(),
			itemSearch: '',
			hits: [],
			itemId: null,
			itemLabel: '',
			receivedQty: '1',
			batchNo: '',
			expiryDate: '',
			purchasePrice: '0',
			iumList: [],
			itemUnitMasterId: null
		};
	}

	function purchaseUnitForDirectLine(line: GrnDirectLine): number | null {
		const ium = line.iumList.find((u) => u.id === line.itemUnitMasterId);
		return ium?.purchaseUnitId ?? null;
	}

	function conversionLabelDirect(line: GrnDirectLine): string {
		const ium = line.iumList.find((u) => u.id === line.itemUnitMasterId);
		return ium?.conversionDisplay ?? '—';
	}

	const filteredDirectLines = $derived.by(() => {
		const q = directLineItemFilter.trim().toLowerCase();
		if (!q) return directLines;
		return directLines.filter((l) => {
			const item = (l.itemLabel ?? '').toLowerCase();
			const conv = conversionLabelDirect(l).toLowerCase();
			const r = (l.receivedQty ?? '').toLowerCase();
			const b = (l.batchNo ?? '').toLowerCase();
			const p = (l.purchasePrice ?? '').toLowerCase();
			return item.includes(q) || conv.includes(q) || r.includes(q) || b.includes(q) || p.includes(q);
		});
	});

	const directLineTableColumns: MariTableColumn<GrnDirectLine>[] = [
		{
			id: 'item',
			header: m.inv_common_item(),
			field: 'itemLabel',
			filterable: false,
			format: (_v, row) => `${row.itemLabel || '—'}${row.isBatchRequired ? ' · batch' : ''}`
		},
		{
			id: 'conversion',
			header: m.inv_common_unit(),
			field: 'itemUnitMasterId',
			filterable: false,
			format: (_v, row) => conversionLabelDirect(row)
		},
		{
			id: 'receivedQty',
			header: m.inv_grn_line_received_qty(),
			field: 'receivedQty',
			filterable: false,
			format: (_v, row) => row.receivedQty?.trim() || '—'
		},
		{
			id: 'batchNo',
			header: m.inv_stock_col_batch(),
			field: 'batchNo',
			filterable: false,
			format: (_v, row) => row.batchNo?.trim() || '—'
		},
		{
			id: 'expiryDate',
			header: m.inv_stock_col_expiry(),
			field: 'expiryDate',
			filterable: false,
			format: (_v, row) => row.expiryDate?.trim() || '—'
		},
		{
			id: 'purchasePrice',
			header: m.inv_stock_col_price(),
			field: 'purchasePrice',
			filterable: false,
			format: (_v, row) => row.purchasePrice?.trim() || '—'
		}
	];

	function openDirectLineDialogForCreate() {
		editingDirectKey = null;
		draftDirectLine = newDirectLine();
		directLineDialogOpen = true;
	}

	function openDirectLineDialogForEdit(line: GrnDirectLine) {
		editingDirectKey = line.key;
		draftDirectLine = {
			...line,
			hits: [...line.hits],
			iumList: [...line.iumList]
		};
		directLineDialogOpen = true;
	}

	function closeDirectLineDialog() {
		directLineDialogOpen = false;
		editingDirectKey = null;
		directLineDialogSubmitting = false;
	}

	async function pickDraftDirectItem(itemId: number) {
		await hydrateGrnDirectLineItem(draftDirectLine, itemId);
		draftDirectLine = { ...draftDirectLine };
	}

	function saveDirectDraftLine() {
		const unitId = purchaseUnitForDirectLine(draftDirectLine);
		if (draftDirectLine.itemId == null || unitId == null) {
			toastService.addToast(
				'Could not save line',
				StatusColorEnum.ERROR,
				'Select an item and a purchase unit conversion.'
			);
			return;
		}
		const rq = draftDirectLine.receivedQty.trim();
		if (!Number.isFinite(Number(rq)) || Number(rq) <= 0) {
			toastService.addToast('Could not save line', StatusColorEnum.ERROR, 'Invalid received quantity.');
			return;
		}
		if (draftDirectLine.isBatchRequired) {
			if (
				!draftDirectLine.batchNo.trim() ||
				!draftDirectLine.expiryDate.trim() ||
				!draftDirectLine.purchasePrice.trim()
			) {
				toastService.addToast(
					'Could not save line',
					StatusColorEnum.ERROR,
					'Batch number, expiry, and purchase price are required for this item.'
				);
				return;
			}
		}
		directLineDialogSubmitting = true;
		try {
			const saved = { ...draftDirectLine, receivedQty: rq };
			if (editingDirectKey) {
				directLines = directLines.map((l) => (l.key === editingDirectKey ? saved : l));
			} else {
				directLines = [...directLines, saved];
			}
			closeDirectLineDialog();
		} finally {
			directLineDialogSubmitting = false;
		}
	}

	function deleteDirectLine(key: string) {
		directLines = directLines.filter((l) => l.key !== key);
	}

	function openGrnFromPoLineDialog(poLineId: number) {
		const row = lineForms.find((f) => f.poLineId === poLineId);
		if (!row) return;
		draftGrnFromPoLine = {
			poLineId: row.poLineId,
			receivedQty: row.receivedQty,
			batchNo: row.batchNo,
			expiryDate: row.expiryDate,
			purchasePrice: row.purchasePrice
		};
		grnFromPoLineDialogOpen = true;
	}

	function closeGrnFromPoLineDialog() {
		grnFromPoLineDialogOpen = false;
		draftGrnFromPoLine = null;
		grnFromPoLineDialogSubmitting = false;
	}

	function saveGrnFromPoLineDraft() {
		if (!draftGrnFromPoLine) return;
		const meta = poLines.find((l) => l.id === draftGrnFromPoLine!.poLineId);
		const rq = draftGrnFromPoLine.receivedQty.trim();
		if (!Number.isFinite(Number(rq)) || Number(rq) <= 0) {
			toastService.addToast('Could not save line', StatusColorEnum.ERROR, 'Invalid received quantity.');
			return;
		}
		if (meta?.isBatchRequired) {
			if (
				!draftGrnFromPoLine.batchNo.trim() ||
				!draftGrnFromPoLine.expiryDate.trim() ||
				!draftGrnFromPoLine.purchasePrice.trim()
			) {
				toastService.addToast(
					'Could not save line',
					StatusColorEnum.ERROR,
					'Batch number, expiry, and purchase price are required for this item.'
				);
				return;
			}
		}
		grnFromPoLineDialogSubmitting = true;
		try {
			patchLineForm(draftGrnFromPoLine.poLineId, {
				receivedQty: rq,
				batchNo: draftGrnFromPoLine.batchNo,
				expiryDate: draftGrnFromPoLine.expiryDate,
				purchasePrice: draftGrnFromPoLine.purchasePrice
			});
			closeGrnFromPoLineDialog();
		} finally {
			grnFromPoLineDialogSubmitting = false;
		}
	}

	function removeGrnFromPoLine(poLineId: number) {
		lineForms = lineForms.filter((f) => f.poLineId !== poLineId);
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

	async function hydrateGrnDirectLineItem(line: GrnDirectLine, itemId: number) {
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
			isBatchRequired?: boolean;
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
		line.isBatchRequired = detail.isBatchRequired ?? false;
	}

	async function searchGrnItems(q: string) {
		if (!hospitalId || !q.trim()) return [];
		const qEnc = encodeURIComponent(q.trim());
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?name=${qEnc}&pageSize=${AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT}`
		);
		if (!res.ok) return [];
		const j = (await res.json()) as { data: { id: number; itemName?: string | null }[] };
		return (j.data ?? []).map((r) => ({
			label: r.itemName ?? '—',
			value: String(r.id)
		}));
	}

	async function loadList() {
		if (!hospitalId) return;
		listLoading = true;
		try {
			try {
				const res = await fetch(
					`/api/heka/hospital/${hospitalId}/home/inventory/grn?pageSize=${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`,
					{ method: 'GET' }
				);
				if (!res.ok) {
					toastService.addToast(
						'Could not load GRN data',
						StatusColorEnum.ERROR,
						`HTTP ${res.status}`
					);
					return;
				}
				const j = (await res.json()) as { data: GrnRow[] };
				list = j.data ?? [];
			} catch (e) {
				toastService.addErrorToast('Could not load GRN data', e);
			}
		} finally {
			listLoading = false;
		}
	}

	async function loadEligiblePos() {
		if (!hospitalId) return;
		try {
			const poRes = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order?pageSize=${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`,
				{ method: 'GET' }
			);
			if (!poRes.ok) {
				toastService.addToast(
					'Could not load eligible POs',
					StatusColorEnum.ERROR,
					`HTTP ${poRes.status}`
				);
				return;
			}
			const j = (await poRes.json()) as { data: PoRowLite[] };
			/** GRN allowed: approved, sent, partially received — filter client-side by status id if needed */
			poList = (j.data ?? []).filter(
				(p) =>
					p.statusTaggingId === InvPoStatusTaggingEnum.APPROVED ||
					p.statusTaggingId === InvPoStatusTaggingEnum.SENT_TO_SUPPLIER ||
					p.statusTaggingId === InvPoStatusTaggingEnum.PARTIALLY_RECEIVED
			);
		} catch (e) {
			toastService.addErrorToast('Could not load eligible POs', e);
		}
	}

	async function onPickPo(poId: string | null) {
		selectedPoId = poId;
		receivingStore = null;
		receivingStoreHint = null;
		poLines = [];
		lineForms = [];
		if (!hospitalId || !poId) return;
		try {
			const [storeRes, poRes] = await Promise.all([
				fetch(
					`/api/heka/hospital/${hospitalId}/home/inventory/grn?mode=receivingStoreForPo&poId=${encodeURIComponent(poId)}`,
					{ method: 'GET' }
				),
				fetch(
					`/api/heka/hospital/${hospitalId}/home/inventory/purchase-order?id=${encodeURIComponent(poId)}`,
					{ method: 'GET' }
				)
			]);

			let storeBody: unknown = null;
			try {
				storeBody = await storeRes.json();
			} catch (e) {
				toastService.addErrorToast('Could not load receiving store', e);
			}

			if (!storeRes.ok) {
				const msg =
					storeBody &&
					typeof storeBody === 'object' &&
					'message' in storeBody &&
					typeof (storeBody as { message: unknown }).message === 'string'
						? (storeBody as { message: string }).message
						: typeof storeBody === 'object' &&
								storeBody &&
								'error' in storeBody
							? String((storeBody as { error: unknown }).error)
							: `HTTP ${storeRes.status}`;
				receivingStoreHint = msg;
				toastService.addToast('Could not load receiving store', StatusColorEnum.ERROR, msg);
			} else if (
				storeBody != null &&
				typeof storeBody === 'object' &&
				'storeId' in storeBody &&
				typeof (storeBody as { storeId: unknown }).storeId === 'number'
			) {
				receivingStore = storeBody as {
					storeId: number;
					storeName: string | null;
				};
			} else {
				receivingStoreHint = m.inv_grn_receiving_store_none_central();
				toastService.addToast(
					'Could not load receiving store',
					StatusColorEnum.ERROR,
					receivingStoreHint
				);
			}

			if (!poRes.ok) {
				toastService.addToast(
					'Could not load PO lines',
					StatusColorEnum.ERROR,
					`HTTP ${poRes.status}`
				);
				return;
			}
			const po = (await poRes.json()) as { lines: PoLine[] } | null;
			poLines = po?.lines ?? [];
			lineForms = poLines.map((ln) => {
				const ordered = Number(ln.quantity);
				const got = Number(ln.qtyReceivedCumulative);
				const rem = Math.max(0, ordered - got);
				return {
					poLineId: ln.id,
					receivedQty: rem > 0 ? String(rem) : '0',
					batchNo: '',
					expiryDate: '',
					purchasePrice: ln.unitPrice ?? ''
				};
			});
		} catch (e) {
			toastService.addErrorToast('Could not load GRN data', e);
		}
	}

	async function submitGrn() {
		if (!hospitalId || !selectedPoId || !receivingStore) {
			toastService.addToast(
				'Could not post GRN',
				StatusColorEnum.ERROR,
				'Select a PO with a valid receiving store.'
			);
			return;
		}
		if (lineForms.length === 0) {
			toastService.addToast(
				'Could not post GRN',
				StatusColorEnum.ERROR,
				'At least one line is required. Reselect the PO to restore lines.'
			);
			return;
		}
		const lines = lineForms
			.map((f) => ({
				poLineId: f.poLineId,
				receivedQty: f.receivedQty.trim(),
				batchNo: f.batchNo.trim() || null,
				expiryDate: f.expiryDate.trim() || null,
				purchasePrice: f.purchasePrice.trim() || null
			}))
			.filter((l) => Number(l.receivedQty) > 0);
		if (lines.length === 0) {
			toastService.addToast(
				'Could not post GRN',
				StatusColorEnum.ERROR,
				'Enter received quantity on at least one line.'
			);
			return;
		}
		const lnById = new Map(poLines.map((l) => [l.id, l]));
		for (const l of lines) {
			const meta = lnById.get(l.poLineId);
			if (meta?.isBatchRequired) {
				if (!l.batchNo || !l.expiryDate || !l.purchasePrice) {
					toastService.addToast(
						'Could not post GRN',
						StatusColorEnum.ERROR,
						'Batch number, expiry, and purchase price are required for batch-tracked items.'
					);
					return;
				}
			}
		}
		submitting = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/inventory/grn`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						poId: selectedPoId,
						storeId: receivingStore.storeId,
						receivedDate,
						lines
					})
				}
			);
			if (!res.ok) {
				toastService.addToast('Could not post GRN', StatusColorEnum.ERROR, await res.text());
				return;
			}
			viewMode = 'list';
			selectedPoId = null;
			receivingStore = null;
			receivingStoreHint = null;
			poLines = [];
			lineForms = [];
			await loadList();
			await loadEligiblePos();
		} catch (e) {
			toastService.addErrorToast('Could not post GRN', e);
		} finally {
			submitting = false;
		}
	}

	function openCreate() {
		grnFormMode = 'fromPo';
		viewMode = 'create';
		void loadEligiblePos();
	}

	function openCreateDirect() {
		grnFormMode = 'direct';
		viewMode = 'create';
		directStoreId = null;
		directSupplierId = null;
		directLines = [];
		directLineItemFilter = '';
		receivedDate = new Date().toISOString().slice(0, 10);
		void loadStoreOptions();
	}

	async function submitGrnDirect() {
		if (!hospitalId || directStoreId == null || directSupplierId == null) {
			toastService.addToast(
				'Could not post GRN',
				StatusColorEnum.ERROR,
				'Store and supplier are required.'
			);
			return;
		}
		const lines: {
			itemId: number;
			unitId: number;
			receivedQty: string;
			batchNo: string | null;
			expiryDate: string | null;
			purchasePrice: string | null;
		}[] = [];
		for (const ln of directLines) {
			const unitId = purchaseUnitForDirectLine(ln);
			if (ln.itemId == null || unitId == null) {
				toastService.addToast(
					'Could not post GRN',
					StatusColorEnum.ERROR,
					'Each line needs an item and purchase unit (conversion).'
				);
				return;
			}
			const rq = ln.receivedQty.trim();
			if (!Number.isFinite(Number(rq)) || Number(rq) <= 0) {
				toastService.addToast('Could not post GRN', StatusColorEnum.ERROR, 'Invalid quantity.');
				return;
			}
			if (ln.isBatchRequired) {
				if (
					!ln.batchNo.trim() ||
					!ln.expiryDate.trim() ||
					!ln.purchasePrice.trim()
				) {
					toastService.addToast(
						'Could not post GRN',
						StatusColorEnum.ERROR,
						'Batch number, expiry, and purchase price are required for batch-tracked items.'
					);
					return;
				}
			}
			lines.push({
				itemId: ln.itemId,
				unitId,
				receivedQty: rq,
				batchNo: ln.batchNo.trim() || null,
				expiryDate: ln.expiryDate.trim() || null,
				purchasePrice: ln.purchasePrice.trim() || null
			});
		}
		if (lines.length === 0) {
			toastService.addToast('Could not post GRN', StatusColorEnum.ERROR, 'Add at least one line.');
			return;
		}
		submitting = true;
		try {
			const res = await fetch(`/api/heka/hospital/${hospitalId}/home/inventory/grn`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mode: 'direct',
					storeId: directStoreId,
					supplierId: directSupplierId,
					receivedDate,
					lines
				})
			});
			if (!res.ok) {
				toastService.addToast('Could not post GRN', StatusColorEnum.ERROR, await res.text());
				return;
			}
			viewMode = 'list';
			directLines = [];
			directStoreId = null;
			directSupplierId = null;
			grnFormMode = 'fromPo';
			await loadList();
			await loadEligiblePos();
		} catch (e) {
			toastService.addErrorToast('Could not post GRN', e);
		} finally {
			submitting = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void loadList();
		void loadEligiblePos();
	});

	function patchLineForm(
		poLineId: number,
		patch: Partial<(typeof lineForms)[number]>
	) {
		lineForms = lineForms.map((r) =>
			r.poLineId === poLineId ? { ...r, ...patch } : r
		);
	}

	const grnLineTableRows = $derived<GrnLineTableRow[]>(
		lineForms.map((f) => {
			const meta = poLines.find((l) => l.id === f.poLineId);
			return {
				id: f.poLineId,
				poLineId: f.poLineId,
				receivedQty: f.receivedQty,
				batchNo: f.batchNo,
				expiryDate: f.expiryDate,
				purchasePrice: f.purchasePrice,
				itemName: meta?.itemName ?? null,
				isBatchRequired: meta?.isBatchRequired ?? false,
				itemUnitMasterId:
					typeof meta?.itemUnitMasterId === 'number' ? meta.itemUnitMasterId : null,
				itemUnitMasterConversion: meta?.itemUnitMasterConversion?.trim()
					? meta.itemUnitMasterConversion
					: null
			};
		})
	);

	const filteredGrnLineTableRows = $derived.by((): GrnLineTableRow[] => {
		const q = grnLineItemFilter.trim().toLowerCase();
		const base = grnLineTableRows;
		if (!q) return base;
		return base.filter((row) => {
			const item = (row.itemName ?? '').toLowerCase();
			const conv = (row.itemUnitMasterConversion ?? '').toLowerCase();
			const r = (row.receivedQty ?? '').toLowerCase();
			return item.includes(q) || conv.includes(q) || r.includes(q);
		});
	});

	const grnLineColumns = $derived.by((): MariTableColumn<GrnLineTableRow>[] => [
		{
			id: 'item',
			header: m.inv_common_item(),
			field: 'itemName',
			format: (_v, row) =>
				`${row.itemName ?? '—'}${row.isBatchRequired ? ' · batch' : ''}`
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
			id: 'receivedQty',
			header: m.inv_grn_line_received_qty(),
			field: 'receivedQty',
			format: (_v, row) => row.receivedQty?.trim() || '—'
		},
		{
			id: 'batchNo',
			header: m.inv_stock_col_batch(),
			field: 'batchNo',
			format: (_v, row) => row.batchNo?.trim() || '—'
		},
		{
			id: 'expiryDate',
			header: m.inv_stock_col_expiry(),
			field: 'expiryDate',
			format: (_v, row) => row.expiryDate?.trim() || '—'
		},
		{
			id: 'purchasePrice',
			header: m.inv_stock_col_price(),
			field: 'purchasePrice',
			format: (_v, row) => row.purchasePrice?.trim() || '—'
		}
	]);

	const columns: MariTableColumn<GrnRow>[] = [
		{
			id: 'storeName',
			header: m.inv_grn_col_store(),
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
			id: 'receivedDate',
			header: m.inv_grn_received_date(),
			field: 'receivedDate'
		},
		{
			id: 'statusName',
			header: m.status(),
			field: 'statusName',
			format: (v, row) => row.statusName ?? '—'
		},
		{
			id: 'receivedByName',
			header: m.inv_common_received_by(),
			field: 'receivedByName',
			widthClass: TableRowEnum.FULL_NAME_COLUMN_WIDTH,
			format: (v, row) => row.receivedByName ?? '—'
		}
	];
</script>

{#if viewMode === 'list'}
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-lg font-semibold">{m.inv_page_grn_title()}</h1>
		<div class="flex flex-wrap gap-2">
			<DaisyUiButton className="d-btn-primary d-btn-sm" onClick={openCreate}>
				<LucidePlus className="size-4" />
				{m.inv_grn_new_title()}
			</DaisyUiButton>
			<DaisyUiButton
				className="d-btn-outline d-btn-sm"
				onClick={openCreateDirect}
			>
				<LucidePlus className="size-4" />
				<span>Direct (no PO)</span>
			</DaisyUiButton>
		</div>
	</div>

	<div class={TableEnum.HEIGHT}>
		<MariTable
			{columns}
			rows={list}
			isLoading={listLoading}
			showRefreshButton={true}
			refreshTooltip={m.refresh_data()}
			rowTooltipGetter={(row) => StringUtil.inventoryAuditRowTooltip(row)}
			on:refresh={() => loadList()}
		/>
	</div>
{:else}
	<DaisyUiCard>
		<DaisyUiCardBody>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					if (grnFormMode === 'direct') {
						void submitGrnDirect();
					} else {
						void submitGrn();
					}
				}}
			>
				<fieldset class="m-0 min-w-0 border-0 p-0">
					<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
						<DaisyUiCardBodyTitle className="mb-0">
							{grnFormMode === 'direct'
								? 'New goods receipt (direct)'
								: m.inv_grn_new_title()}
						</DaisyUiCardBodyTitle>
						<DaisyUiButton
							type="button"
							className="d-btn-sm d-btn-ghost d-btn-outline"
							onClick={() => {
								viewMode = 'list';
							}}
						>
							<LucideArrowLeft className="size-4" />
							{m.inv_common_back_to_list()}
						</DaisyUiButton>
					</div>
				</fieldset>

				{#if grnFormMode === 'fromPo'}
				<div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:gap-10">
					<fieldset class="m-0 min-w-0 flex-1 border-0 p-0">
						<div class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
							<div class="flex flex-col gap-4">
								<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
									<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_grn_select_po()}</DaisyUiLabel>
									<div class="max-w-80 flex-1">
										<DaisyUISearchSelect
											value={selectedPoId ?? ''}
											options={poList.map((p) => ({
												label: `${p.poNo ?? '—'} · ${p.supplierName ?? p.statusName ?? '—'}`,
												value: p.id
											}))}
											onChange={(v: string) => onPickPo(v || null)}
											placeholder="Select a PO..."
											className="w-full"
										/>
									</div>
								</div>

								<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
									<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_grn_received_date()}</DaisyUiLabel>
									<div class="max-w-80 flex-1">
										<DaisyUiInputField inputType="date" bind:value={receivedDate} />
									</div>
								</div>
							</div>
							
							<div class="flex flex-col gap-4">
								<div class="p-4 bg-base-200 rounded-lg">
									{#if receivingStore}
										<p class="text-sm">
											<span class="opacity-70 inline-block mb-1">{m.inv_grn_receiving_store()}:</span><br/>
											<strong class="text-lg">
												{receivingStore.storeName ?? '—'}
											</strong>
										</p>
									{:else if selectedPoId}
										<p class="text-sm text-warning font-medium">
											{m.inv_grn_receiving_store()}: —
										</p>
										{#if receivingStoreHint}
											<p class="text-xs text-base-content/80 mt-2 leading-relaxed">
												{receivingStoreHint}
											</p>
										{/if}
									{:else}
										<p class="text-sm opacity-50 text-center py-2">—</p>
									{/if}
								</div>
							</div>
						</div>
					</fieldset>
				</div>
				{:else}
					<div class="mb-6 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
						<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_common_store()}</DaisyUiLabel>
						<div class="max-w-sm flex-1">
							<DaisyUISearchSelect
								value={directStoreId != null ? String(directStoreId) : ''}
								options={storeOptions.map((s) => ({
									label: s.name ?? `Store #${s.id}`,
									value: String(s.id)
								}))}
								onChange={(v: string) => {
									directStoreId = v ? Number(v) : null;
								}}
								placeholder="Receiving store (central)…"
								className="w-full"
							/>
						</div>
					</div>
					<div class="mb-6 max-w-md">
						<DaisyUiLabel className="mb-1 text-xs">{m.inv_po_supplier_search()}</DaisyUiLabel>
						<DaisyUISearchSelect
							value={directSupplierId != null ? String(directSupplierId) : ''}
							searchFn={async (q: string) => {
								const qEnc = encodeURIComponent(q.trim());
								const res = await fetch(
									`/api/heka/hospital/${hospitalId}/home/inventory-setup/supplier-setup?mode=search&q=${qEnc}&limit=30`
								);
								const j = await res.json();
								return (j ?? []).map((s: { id: number; name: string | null }) => ({
									label: s.name ?? '—',
									value: String(s.id)
								}));
							}}
							onChange={(v: string) => {
								directSupplierId = v ? Number(v) : null;
							}}
							placeholder="Search supplier…"
							className="d-input d-input-sm w-full"
						/>
					</div>
					<div class="mb-4">
						<DaisyUiLabel className="shrink-0 sm:w-36">{m.inv_grn_received_date()}</DaisyUiLabel>
						<div class="max-w-xs mt-1">
							<DaisyUiInputField inputType="date" bind:value={receivedDate} />
						</div>
					</div>
					<DaisyUiCard>
						<DaisyUiCardBody className="gap-4">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<DaisyUiCardBodyTitle className="text-base">{m.inv_po_lines()}</DaisyUiCardBodyTitle>
								<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
									<input
										type="text"
										class="d-input d-input-bordered d-input-sm w-full sm:w-56"
										placeholder="Filter line items…"
										bind:value={directLineItemFilter}
										aria-label="Filter line items"
									/>
									<DaisyUiButton
										type="button"
										className="d-btn-sm d-btn-primary"
										onClick={() => openDirectLineDialogForCreate()}
									>
										<LucidePlus className="size-4" />
										+ Add Item
									</DaisyUiButton>
								</div>
							</div>
							<div class="h-[420px] min-h-0">
								<MariTable
									columns={directLineTableColumns}
									rows={filteredDirectLines}
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
													onClick={() => openDirectLineDialogForEdit(row)}
												>
													<LucidePencil className="size-5" />
												</DaisyUiButton>
											</DaisyUiTooltip>
											<DaisyUiTooltip
												tooltipText="Delete"
												className="d-tooltip-error d-tooltip-right"
											>
												<DaisyUiButton
													type="button"
													className="d-btn-ghost d-btn-sm d-btn-error"
													onClick={() => deleteDirectLine(row.key)}
												>
													<LucideTrash2 className="size-5" />
												</DaisyUiButton>
											</DaisyUiTooltip>
										</div>
									{/snippet}
								</MariTable>
							</div>
							<div
								class="flex flex-wrap items-center justify-between gap-3 border-t border-base-200 pt-4"
							>
								<div class="text-sm opacity-80">
									Total items: <span class="font-semibold">{directLines.length}</span>
								</div>
							</div>
						</DaisyUiCardBody>
					</DaisyUiCard>
				{/if}

				{#if grnFormMode === 'fromPo' && lineForms.length > 0}
					<div class="mt-8">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
							<h3 class="font-medium text-lg text-base-content/90">Items Received</h3>
							<input
								type="text"
								class="d-input d-input-bordered d-input-sm w-full sm:max-w-xs"
								placeholder="Filter line items…"
								bind:value={grnLineItemFilter}
								aria-label="Filter line items"
							/>
						</div>
						<div class="h-[420px] min-h-0 w-full">
							<MariTable
								columns={grnLineColumns}
								rows={filteredGrnLineTableRows}
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
												onClick={() => openGrnFromPoLineDialog(row.poLineId)}
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
												onClick={() => removeGrnFromPoLine(row.poLineId)}
											>
												<LucideTrash2 className="size-5" />
											</DaisyUiButton>
										</DaisyUiTooltip>
									</div>
								{/snippet}
							</MariTable>
						</div>
					</div>

					<DaisyUiCardBodyAction className="mt-8 flex flex-wrap gap-3 border-t border-base-200 pt-6">
						<DaisyUiButton
							type="submit"
							className="d-btn-wide d-btn-primary"
							disabled={submitting}
						>
							{m.inv_grn_submit()}
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
				{:else if grnFormMode === 'fromPo' && selectedPoId && lineForms.length === 0 && poLines.length > 0}
					<div
						class="rounded-box border border-dashed border-base-300 bg-base-200/30 px-4 py-3 text-sm text-base-content/80 mt-8"
					>
						All lines were removed. Reselect the purchase order to restore lines, or pick a
						different PO.
					</div>
					<DaisyUiCardBodyAction className="mt-8 flex flex-wrap gap-3 border-t border-base-200 pt-6">
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
				{:else if grnFormMode === 'direct' && directLines.length > 0}
					<DaisyUiCardBodyAction className="mt-8 flex flex-wrap gap-3 border-t border-base-200 pt-6">
						<DaisyUiButton
							type="submit"
							className="d-btn-wide d-btn-primary"
							disabled={submitting}
						>
							{m.inv_grn_submit()}
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
				{/if}

				<DaisyUiModal
					groupName="grn-po-line-dialog"
					open={grnFromPoLineDialogOpen}
					onClose={() => closeGrnFromPoLineDialog()}
					className="d-modal-middle"
				>
					<div class="d-modal-box max-w-lg" role="document">
						<h3 class="text-lg font-bold">Edit line</h3>
						{#if draftGrnFromPoLine}
							<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div>
									<DaisyUiLabel className="text-xs opacity-80"
										>{m.inv_grn_line_received_qty()}</DaisyUiLabel
									>
									<input
										type="text"
										class="d-input d-input-bordered w-full"
										bind:value={draftGrnFromPoLine.receivedQty}
										aria-label={m.inv_grn_line_received_qty()}
									/>
								</div>
								<div>
									<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_batch()}</DaisyUiLabel>
									<input
										type="text"
										class="d-input d-input-bordered w-full"
										bind:value={draftGrnFromPoLine.batchNo}
										aria-label={m.inv_stock_col_batch()}
									/>
								</div>
								<div>
									<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_expiry()}</DaisyUiLabel>
									<input
										type="date"
										class="d-input d-input-bordered w-full"
										bind:value={draftGrnFromPoLine.expiryDate}
										aria-label={m.inv_stock_col_expiry()}
									/>
								</div>
								<div>
									<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_price()}</DaisyUiLabel>
									<input
										type="text"
										class="d-input d-input-bordered w-full"
										bind:value={draftGrnFromPoLine.purchasePrice}
										aria-label={m.inv_stock_col_price()}
									/>
								</div>
							</div>
						{/if}
						<div class="d-modal-action mt-6">
							<DaisyUiButton
								type="button"
								className="d-btn"
								disabled={grnFromPoLineDialogSubmitting}
								onClick={() => closeGrnFromPoLineDialog()}
							>
								{m.cancel()}
							</DaisyUiButton>
							<DaisyUiButton
								type="button"
								className="d-btn d-btn-primary"
								disabled={grnFromPoLineDialogSubmitting}
								onClick={() => saveGrnFromPoLineDraft()}
							>
								{m.save()}
							</DaisyUiButton>
						</div>
					</div>
				</DaisyUiModal>

				<DaisyUiModal
					groupName="grn-direct-line-dialog"
					open={directLineDialogOpen}
					onClose={() => closeDirectLineDialog()}
					className="d-modal-middle"
				>
					<div class="d-modal-box max-w-2xl" role="document">
						<h3 class="text-lg font-bold">
							{editingDirectKey ? 'Edit line item' : 'Add line item'}
						</h3>
						<div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="sm:col-span-2">
								<DaisyUiLabel className="text-xs opacity-80">{m.inv_pr_line_item_search()}</DaisyUiLabel>
								<DaisyUISearchSelect
									value={draftDirectLine.itemId != null ? String(draftDirectLine.itemId) : ''}
									searchFn={searchGrnItems}
									onChange={(v: string) => {
										if (v) void pickDraftDirectItem(Number(v));
									}}
									placeholder="Search item…"
									className="input-sm w-full"
								/>
								<div class="mt-1 truncate text-sm font-medium">
									{draftDirectLine.itemId != null ? draftDirectLine.itemLabel : '—'}
								</div>
							</div>
							<div>
								<DaisyUiLabel className="text-xs opacity-80">{m.inv_common_unit()}</DaisyUiLabel>
								<DaisyUISearchSelect
									value={draftDirectLine.itemUnitMasterId != null
										? String(draftDirectLine.itemUnitMasterId)
										: ''}
									options={draftDirectLine.iumList.map((u) => ({
										label: u.conversionDisplay,
										value: String(u.id)
									}))}
									onChange={(v: string) => {
										draftDirectLine.itemUnitMasterId = v ? Number(v) : null;
										draftDirectLine = { ...draftDirectLine };
									}}
									placeholder="Select unit…"
									className="w-full"
									disabled={draftDirectLine.itemId == null}
								/>
							</div>
							<div>
								<DaisyUiLabel className="text-xs opacity-80"
									>{m.inv_grn_line_received_qty()}</DaisyUiLabel
								>
								<input
									type="text"
									class="d-input d-input-bordered w-full"
									bind:value={draftDirectLine.receivedQty}
									disabled={draftDirectLine.itemId == null}
									aria-label={m.inv_grn_line_received_qty()}
								/>
							</div>
							<div>
								<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_batch()}</DaisyUiLabel>
								<input
									type="text"
									class="d-input d-input-bordered w-full"
									bind:value={draftDirectLine.batchNo}
									disabled={draftDirectLine.itemId == null}
									aria-label={m.inv_stock_col_batch()}
								/>
							</div>
							<div>
								<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_expiry()}</DaisyUiLabel>
								<input
									type="date"
									class="d-input d-input-bordered w-full"
									bind:value={draftDirectLine.expiryDate}
									disabled={draftDirectLine.itemId == null}
									aria-label={m.inv_stock_col_expiry()}
								/>
							</div>
							<div>
								<DaisyUiLabel className="text-xs opacity-80">{m.inv_stock_col_price()}</DaisyUiLabel>
								<input
									type="text"
									class="d-input d-input-bordered w-full"
									bind:value={draftDirectLine.purchasePrice}
									disabled={draftDirectLine.itemId == null}
									aria-label={m.inv_stock_col_price()}
								/>
							</div>
						</div>
						<div class="d-modal-action mt-6">
							<DaisyUiButton
								type="button"
								className="d-btn"
								disabled={directLineDialogSubmitting}
								onClick={() => closeDirectLineDialog()}
							>
								{m.cancel()}
							</DaisyUiButton>
							<DaisyUiButton
								type="button"
								className="d-btn d-btn-primary"
								disabled={directLineDialogSubmitting}
								onClick={() => saveDirectDraftLine()}
							>
								{m.save()}
							</DaisyUiButton>
						</div>
					</div>
				</DaisyUiModal>
			</form>
		</DaisyUiCardBody>
	</DaisyUiCard>
{/if}
