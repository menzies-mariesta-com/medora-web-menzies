<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import GrnFromPoLineDialogContent from '$lib/component/own/local/private/medora/inventory/grn/GrnFromPoLineDialogContent.svelte';
	import GrnDirectLineDialogContent from '$lib/component/own/local/private/medora/inventory/grn/GrnDirectLineDialogContent.svelte';
	import GrnDirectLinesCard from '$lib/component/own/local/private/medora/inventory/grn/GrnDirectLinesCard.svelte';
	import GrnInvoiceChargeFields from '$lib/component/own/local/private/medora/inventory/grn/GrnInvoiceChargeFields.svelte';
	import GrnFormFieldRow from '$lib/component/own/local/private/medora/inventory/grn/GrnFormFieldRow.svelte';
	import InventoryTablePickerDialogContent from '$lib/component/own/local/private/medora/inventory/InventoryTablePickerDialogContent.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import MenziesTable, {
		type MenziesTableColumn,
		type MenziesTableColumnsInput
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import { TableRowEnum } from '$lib/model/enum/table-row.enum';
	import { m } from '$lib/paraglide/messages';
	import { InvPoStatusTaggingEnum } from '$lib/model/enum/db-link';
	import {
		freeUnitIdFromIum,
		resolveFreeUnitIumId
	} from '$lib/tool/inventory/grn-free-unit.util';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { medoraHospitalPageUrl } from '$lib/model/enum/routes.enum';
	import {
		trimInventoryNumericDisplay,
		trimMetricQtyDisplay
	} from '$lib/tool/inventory/format-line-item-metric-tile-value.util';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);

	let { data } = $props();
	const layoutSessionUser = $derived.by(() => {
		const id =
			(
				data as { currentUserId?: string | null }
			).currentUserId?.trim() || null;
		const name =
			(
				data as { currentUserName?: string | null }
			).currentUserName?.trim() || null;
		return { id, name };
	});
	const selectedInventoryFromStoreId = $derived(
		(data as { selectedInventoryFromStoreId?: number | null })
			.selectedInventoryFromStoreId ?? null
	);
	const grnListPath = $derived(
		medoraHospitalPageUrl(hospitalId, '/medora/home/inventory/grn' as any)
	);

	async function goBackToGrnList() {
		await goto(resolve(grnListPath as any));
	}

	const navReceivingStoreLabel = $derived.by(() => {
		const id = selectedInventoryFromStoreId;
		const nav = (
			data as {
				inventoryFromStoresForNav?: {
					id: number;
					storeName: string | null;
				}[];
			}
		).inventoryFromStoresForNav;
		const row = nav?.find((s) => s.id === id);
		if (row?.storeName?.trim()) return row.storeName.trim();
		return '—';
	});

	const toastService = new ToastService();

	const grnSectionPanel =
		'h-full rounded-box border border-base-200 bg-base-200/25 p-5 shadow-sm';
	const grnSectionTitle =
		'mb-4 text-xs font-semibold tracking-wide text-base-content/60 uppercase';
	const grnFieldsStack = 'flex min-w-0 flex-col gap-4';
	const grnHeaderGridDirect =
		'mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch';
	const grnHeaderGridFromPo =
		'mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch';

	/** Bound line/header fields may be null at runtime (e.g. cleared date input). */
	function trimField(v: unknown): string {
		if (v == null) return '';
		return String(v).trim();
	}

	type GrnLineTableRow = {
		id: number;
		poLineId: number;
		purchasedQty: string;
		batchNo: string;
		expiryDate: string;
		purchasePrice: string;
		itemName: string | null;
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
		itemUnitMasterId?: number | null;
		itemUnitMasterConversion?: string | null;
	};

	type ReceivingStore = {
		storeId: number;
		storeName: string | null;
		branchId?: string | null;
	} | null;

	type PoRowLite = {
		id: string;
		poNo?: string | null;
		statusTaggingId: number;
		statusName: string | null;
		supplierName?: string | null;
		storeName?: string | null;
		totalAmount?: string | null;
		itemNames?: string | null;
	};

	let grnFormMode = $state<'fromPo' | 'direct'>('fromPo');

	let poList = $state<PoRowLite[]>([]);
	let selectedPoId = $state<string | null>(null);
	let poPickerBusy = $state(false);
	let receivingStore = $state<ReceivingStore>(null);
	/** Set when PO is selected but API returns null or error. */
	let receivingStoreHint = $state<string | null>(null);
	let receivedDate = $state(new Date().toISOString().slice(0, 10));
	let invoiceNo = $state('');
	let invoiceDate = $state('');
	let invoiceAmount = $state('');
	let invoiceDiscountAmount = $state('0');
	let invoiceDiscountPercent = $state('0');
	let invoiceTaxAmount = $state('0');
	let invoiceTaxPercent = $state('0');
	let invoicePhotoUrl = $state<string | null>(null);
	let receivedByUserId = $state<string | null>(null);

	function resetInvoiceCharges() {
		invoiceDiscountAmount = '0';
		invoiceDiscountPercent = '0';
		invoiceTaxAmount = '0';
		invoiceTaxPercent = '0';
	}
	let invoicePhotoUploading = $state(false);
	let poLines = $state<PoLine[]>([]);
	let lineForms = $state<
		{
			poLineId: number;
			purchasedQty: string;
			batchNo: string;
			expiryDate: string;
			purchasePrice: string;
			freeQty: string;
			freeUnitId: number | string | null;
			freeUnitIumId: number | null;
			discountAmount: string;
			discountPercent: string;
			taxAmount: string;
			taxPercent: string;
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
		purchasedQty: string;
		batchNo: string;
		expiryDate: string;
		purchasePrice: string;
		freeQty: string;
		freeUnitId: number | string | null;
		freeUnitIumId: number | null;
		discountAmount: string;
		discountPercent: string;
		taxAmount: string;
		taxPercent: string;
		iumList: IumOpt[];
		itemUnitMasterId: number | null;
	};

	let directStoreId = $state<number | null>(null);
	let directSupplierId = $state<number | null>(null);
	let directLines = $state<GrnDirectLine[]>([]);

	const isInvoicePhotoPreviewable = $derived.by(() => {
		const url = invoicePhotoUrl?.trim() ?? '';
		if (!url) return false;
		const u = url.toLowerCase();
		return (
			u.endsWith('.png') ||
			u.endsWith('.jpg') ||
			u.endsWith('.jpeg') ||
			u.endsWith('.webp') ||
			u.endsWith('.gif')
		);
	});

	async function uploadInvoicePhoto(file: File) {
		invoicePhotoUploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/upload/grn-invoice', {
				method: 'POST',
				body: fd
			});
			if (!res.ok) {
				toastService.addToast(
					'Could not upload invoice file',
					StatusColorEnum.ERROR,
					await res.text()
				);
				return;
			}
			const j = (await res.json()) as { url?: unknown };
			if (typeof j?.url !== 'string' || !j.url.trim()) {
				toastService.addToast(
					'Could not upload invoice file',
					StatusColorEnum.ERROR,
					'Invalid upload response.'
				);
				return;
			}
			invoicePhotoUrl = j.url.trim();
		} catch (e) {
			toastService.addErrorToast('Could not upload invoice file', e);
		} finally {
			invoicePhotoUploading = false;
		}
	}

	async function searchReceivedByUsers(q: string) {
		if (!hospitalId) return [];
		const sp = new URLSearchParams();
		sp.set('q', q.trim());
		sp.set('limit', '20');
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory/grn/received-by-search?${sp.toString()}`,
			{ method: 'GET' }
		);
		if (!res.ok) return [];
		const j = (await res.json()) as {
			userId: string;
			name: string | null;
		}[];
		return (j ?? []).map((u) => ({
			label: u.name?.trim() ? u.name.trim() : '—',
			value: u.userId
		}));
	}

	async function getReceivedByLabelForValue(
		userId: string
	): Promise<string> {
		const uid = userId.trim();
		if (!uid) return '—';
		if (uid === layoutSessionUser.id && layoutSessionUser.name)
			return layoutSessionUser.name;
		if (!hospitalId) return '—';
		const sp = new URLSearchParams();
		sp.set('userId', uid);
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory/grn/received-by-search?${sp.toString()}`,
			{ method: 'GET' }
		);
		if (!res.ok) return '—';
		const j = (await res.json()) as {
			userId: string;
			name: string | null;
		}[];
		const row = j?.[0];
		return row?.name?.trim() ? row.name.trim() : '—';
	}

	let directLineDialogActive = $state(false);
	let editingDirectKey = $state<string | null>(null);
	let draftDirectLine = $state<GrnDirectLine>(newDirectLine());

	let grnFromPoLineDialogActive = $state(false);
	let draftGrnFromPoLine = $state<{
		poLineId: number;
		purchasedQty: string;
		batchNo: string;
		expiryDate: string;
		purchasePrice: string;
		freeQty: string;
		freeUnitId: number | string | null;
		freeUnitIumId: number | null;
		discountAmount: string;
		discountPercent: string;
		taxAmount: string;
		taxPercent: string;
		iumList: IumOpt[];
	} | null>(null);

	function allowedFreeUnitIdsFromIums(list: IumOpt[]): Set<string> {
		const allowed = new Set<string>();
		for (const ium of list ?? []) {
			if (typeof ium?.purchaseUnitId === 'number')
				allowed.add(String(ium.purchaseUnitId));
			if (typeof ium?.issueUnitId === 'number')
				allowed.add(String(ium.issueUnitId));
		}
		return allowed;
	}

	function newDirectLine(): GrnDirectLine {
		return {
			key: crypto.randomUUID(),
			itemSearch: '',
			hits: [],
			itemId: null,
			itemLabel: '',
			purchasedQty: '1',
			batchNo: '',
			expiryDate: '',
			purchasePrice: '0',
			freeQty: '0',
			freeUnitId: null,
			freeUnitIumId: null,
			discountAmount: '0',
			discountPercent: '0',
			taxAmount: '0',
			taxPercent: '0',
			iumList: [],
			itemUnitMasterId: null
		};
	}

	function purchaseUnitForDirectLine(
		line: GrnDirectLine
	): number | null {
		const ium = line.iumList.find(
			(u) => u.id === line.itemUnitMasterId
		);
		return ium?.purchaseUnitId ?? null;
	}

	function ensureDirectFreeUnit(line: GrnDirectLine) {
		const receivedIum =
			line.iumList.find((u) => u.id === line.itemUnitMasterId) ??
			null;
		const purchaseUnitId = receivedIum?.purchaseUnitId ?? null;
		if (line.freeUnitIumId == null && line.freeUnitId == null) {
			line.freeUnitIumId = receivedIum?.id ?? null;
			line.freeUnitId = purchaseUnitId;
			return;
		}
		line.freeUnitIumId = resolveFreeUnitIumId(
			line.iumList,
			line.freeUnitId,
			line.freeUnitIumId ?? receivedIum?.id ?? null
		);
		const chosen =
			line.freeUnitIumId != null
				? (line.iumList.find((u) => u.id === line.freeUnitIumId) ??
					null)
				: null;
		line.freeUnitId =
			freeUnitIdFromIum(chosen) ?? line.freeUnitId ?? purchaseUnitId;
	}

	function conversionLabelDirect(line: GrnDirectLine): string {
		const ium = line.iumList.find(
			(u) => u.id === line.itemUnitMasterId
		);
		return ium?.conversionDisplay ?? '—';
	}

	const directLineTableColumns: MenziesTableColumn<GrnDirectLine>[] = [
		{
			id: 'item',
			header: m.inv_common_item(),
			field: 'itemLabel',
			format: (_v, row) => row.itemLabel || '—'
		},
		{
			id: 'conversion',
			header: m.inv_common_unit(),
			field: 'itemUnitMasterId',
			format: (_v, row) => conversionLabelDirect(row)
		},
		{
			id: 'purchasedQty',
			header: m.inv_grn_line_purchased_qty(),
			field: 'purchasedQty',
			format: (_v, row) => {
				const t = row.purchasedQty?.trim();
				return t ? trimMetricQtyDisplay(t) : '—';
			}
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
			format: (_v, row) => {
				const t = String(row.purchasePrice ?? '').trim();
				return t ? trimInventoryNumericDisplay(t, 4) : '—';
			}
		}
	];

	async function openDirectLineDialogForCreate() {
		editingDirectKey = null;
		draftDirectLine = newDirectLine();
		directLineDialogActive = true;
		try {
			await dialogService.open({
				title: m.inv_line_modal_title_add(),
				modalClassName: 'max-w-2xl',
				component: GrnDirectLineDialogContent,
				props: {
					draftDirectLine,
					searchItemsFn: searchGrnItems,
					onPickItem: pickDraftDirectItem,
					onSyncFreeUnit: () => {
						ensureDirectFreeUnit(draftDirectLine);
					},
					onSaveAttempt: saveDirectDraftLine
				}
			});
		} finally {
			directLineDialogActive = false;
			editingDirectKey = null;
		}
	}

	async function openDirectLineDialogForEdit(line: GrnDirectLine) {
		editingDirectKey = line.key;
		draftDirectLine = {
			...line,
			hits: [...line.hits],
			iumList: [...line.iumList]
		};
		ensureDirectFreeUnit(draftDirectLine);
		draftDirectLine = { ...draftDirectLine };
		directLineDialogActive = true;
		try {
			await dialogService.open({
				title: m.inv_line_modal_title_edit(),
				modalClassName: 'max-w-2xl',
				component: GrnDirectLineDialogContent,
				props: {
					draftDirectLine,
					searchItemsFn: searchGrnItems,
					onPickItem: pickDraftDirectItem,
					onSyncFreeUnit: () => {
						ensureDirectFreeUnit(draftDirectLine);
					},
					onSaveAttempt: saveDirectDraftLine
				}
			});
		} finally {
			directLineDialogActive = false;
			editingDirectKey = null;
		}
	}

	async function pickDraftDirectItem(itemId: number) {
		await hydrateGrnDirectLineItem(draftDirectLine, itemId);
		// Keep the same `draftDirectLine` object reference while the dialog is open.
	}

	function saveDirectDraftLine(): boolean {
		const unitId = purchaseUnitForDirectLine(draftDirectLine);
		if (draftDirectLine.itemId == null || unitId == null) {
			toastService.addToast(
				'Could not save line',
				StatusColorEnum.ERROR,
				'Select an item and a purchase unit conversion.'
			);
			return false;
		}
		ensureDirectFreeUnit(draftDirectLine);
		const rq = trimField(draftDirectLine.purchasedQty);
		if (!Number.isFinite(Number(rq)) || Number(rq) <= 0) {
			toastService.addToast(
				'Could not save line',
				StatusColorEnum.ERROR,
				'Invalid purchased quantity.'
			);
			return false;
		}
		const missingDirect: string[] = [];
		if (!trimField(draftDirectLine.batchNo))
			missingDirect.push('batch number');
		if (!trimField(draftDirectLine.expiryDate))
			missingDirect.push('expiry');
		if (!trimField(draftDirectLine.purchasePrice))
			missingDirect.push('purchase price');
		if (missingDirect.length > 0) {
			toastService.addToast(
				'Could not save line',
				StatusColorEnum.ERROR,
				`Missing: ${missingDirect.join(', ')}.`
			);
			return false;
		}
		const saved = { ...draftDirectLine, purchasedQty: rq };
		if (editingDirectKey) {
			directLines = directLines.map((l) =>
				l.key === editingDirectKey ? saved : l
			);
		} else {
			directLines = [...directLines, saved];
		}
		return true;
	}

	function deleteDirectLine(key: string) {
		directLines = directLines.filter((l) => l.key !== key);
	}

	async function openGrnFromPoLineDialog(poLineId: number) {
		const row = lineForms.find((f) => f.poLineId === poLineId);
		if (!row) return;
		draftGrnFromPoLine = {
			poLineId: row.poLineId,
			purchasedQty: row.purchasedQty,
			batchNo: row.batchNo,
			expiryDate: row.expiryDate,
			purchasePrice: row.purchasePrice,
			freeQty: row.freeQty,
			freeUnitId: row.freeUnitId,
			freeUnitIumId: row.freeUnitIumId ?? null,
			discountAmount: row.discountAmount,
			discountPercent: row.discountPercent,
			taxAmount: row.taxAmount,
			taxPercent: row.taxPercent,
			iumList: []
		};

		// Provide iumList (allowed conversions) for unit picking in dialog
		try {
			const meta = poLines.find((l) => l.id === poLineId);
			if (meta?.itemId && hospitalId) {
				const [detailRes, iumRes] = await Promise.all([
					fetch(
						`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?id=${meta.itemId}`,
						{ method: 'GET' }
					),
					fetch(
						`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?mode=itemUnitMasters`,
						{ method: 'GET' }
					)
				]);
				if (detailRes.ok && iumRes.ok && draftGrnFromPoLine) {
					const detail = (await detailRes.json()) as {
						itemUnitMasterIds?: number[];
						defaultItemUnitMasterId?: number | null;
					};
					const allIum = (await iumRes.json()) as IumOpt[];
					const allowed = new Set(detail.itemUnitMasterIds ?? []);
					const allowedIum = allIum.filter((u) => allowed.has(u.id));
					const preferred =
						meta.itemUnitMasterId ??
						detail.defaultItemUnitMasterId ??
						null;
					const chosen =
						preferred != null &&
						allowedIum.some((u) => u.id === preferred)
							? (allowedIum.find((u) => u.id === preferred) ?? null)
							: (allowedIum[0] ?? null);
					draftGrnFromPoLine.iumList = allowedIum;
					if (
						draftGrnFromPoLine.freeUnitIumId == null &&
						(draftGrnFromPoLine.freeUnitId == null ||
							draftGrnFromPoLine.freeUnitId === '')
					) {
						draftGrnFromPoLine.freeUnitId =
							chosen?.purchaseUnitId ?? meta.unitId ?? null;
						draftGrnFromPoLine.freeUnitIumId = chosen?.id ?? null;
					} else {
						draftGrnFromPoLine.freeUnitIumId = resolveFreeUnitIumId(
							allowedIum,
							draftGrnFromPoLine.freeUnitId,
							draftGrnFromPoLine.freeUnitIumId ?? preferred
						);
						const freeIum = allowedIum.find(
							(u) => u.id === draftGrnFromPoLine!.freeUnitIumId
						);
						draftGrnFromPoLine.freeUnitId =
							freeUnitIdFromIum(freeIum) ??
							draftGrnFromPoLine.freeUnitId ??
							meta.unitId ??
							null;
					}
					draftGrnFromPoLine = { ...draftGrnFromPoLine };
				}
			}
		} catch {
			// ignore; dialog can still open with disabled selector
		}
		grnFromPoLineDialogActive = true;
		try {
			await dialogService.open({
				title: m.inv_line_edit_short_title(),
				modalClassName: 'max-w-lg',
				component: GrnFromPoLineDialogContent,
				props: {
					draftGrnFromPoLine,
					onSaveAttempt: saveGrnFromPoLineDraft
				}
			});
		} finally {
			grnFromPoLineDialogActive = false;
			draftGrnFromPoLine = null;
		}
	}

	function saveGrnFromPoLineDraft(): boolean {
		if (!draftGrnFromPoLine) return false;
		const meta = poLines.find(
			(l) => l.id === draftGrnFromPoLine!.poLineId
		);
		const rq = trimField(draftGrnFromPoLine.purchasedQty);
		if (!Number.isFinite(Number(rq)) || Number(rq) <= 0) {
			toastService.addToast(
				'Could not save line',
				StatusColorEnum.ERROR,
				'Invalid purchased quantity.'
			);
			return false;
		}
		const missingPo: string[] = [];
		if (!trimField(draftGrnFromPoLine.batchNo))
			missingPo.push('batch number');
		if (!trimField(draftGrnFromPoLine.expiryDate))
			missingPo.push('expiry');
		if (!trimField(draftGrnFromPoLine.purchasePrice))
			missingPo.push('purchase price');
		if (missingPo.length > 0) {
			toastService.addToast(
				'Could not save line',
				StatusColorEnum.ERROR,
				`Missing: ${missingPo.join(', ')}.`
			);
			return false;
		}
		patchLineForm(draftGrnFromPoLine.poLineId, {
			purchasedQty: rq,
			batchNo: draftGrnFromPoLine.batchNo,
			expiryDate: draftGrnFromPoLine.expiryDate,
			purchasePrice: draftGrnFromPoLine.purchasePrice,
			freeQty: draftGrnFromPoLine.freeQty,
			freeUnitId: draftGrnFromPoLine.freeUnitId,
			freeUnitIumId: draftGrnFromPoLine.freeUnitIumId,
			discountAmount: draftGrnFromPoLine.discountAmount,
			discountPercent: draftGrnFromPoLine.discountPercent,
			taxAmount: draftGrnFromPoLine.taxAmount,
			taxPercent: draftGrnFromPoLine.taxPercent
		});
		return true;
	}

	function removeGrnFromPoLine(poLineId: number) {
		lineForms = lineForms.filter((f) => f.poLineId !== poLineId);
	}

	async function hydrateGrnDirectLineItem(
		line: GrnDirectLine,
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
		ensureDirectFreeUnit(line);
	}

	async function searchGrnItems(q: string) {
		if (!hospitalId) return [];
		const sp = new URLSearchParams();
		sp.set('pageSize', String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT));
		const name = q.trim();
		if (name) sp.set('name', name);
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?${sp.toString()}`
		);
		if (!res.ok) return [];
		const j = (await res.json()) as {
			data: { id: number; itemName?: string | null }[];
		};
		return (j.data ?? []).map((r) => ({
			label: r.itemName ?? '—',
			value: String(r.id)
		}));
	}

	function pickerCsvItemLines(
		csv: string | null | undefined
	): string {
		const lines = (csv ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		return lines.join('\n') || '—';
	}

	async function openPoPicker() {
		if (!hospitalId) return;
		poPickerBusy = true;
		try {
			await loadEligiblePos();
			const result = await dialogService.open<PoRowLite>({
				fullScreen: true,
				component: InventoryTablePickerDialogContent,
				props: {
					title: m.inv_grn_select_po(),
					columns: poPickerColumns as MenziesTableColumnsInput,
					rows: poList,
					pageSize: '150'
				}
			});
			if (result.confirmed && result.data) {
				await onPickPo(result.data.id);
			}
		} finally {
			poPickerBusy = false;
		}
	}

	const selectedPoSummary = $derived.by(() => {
		if (!selectedPoId) return '';
		const p = poList.find((x) => x.id === selectedPoId);
		if (!p) return '';
		return `${p.poNo ?? '—'} · ${p.supplierName ?? p.statusName ?? '—'}`;
	});

	const poPickerColumns = $derived.by((): MenziesTableColumn[] => [
		{
			id: 'poNo',
			header: m.inv_po_no(),
			field: 'poNo',
			filterable: false,
			format: (_v, row) => (row as PoRowLite).poNo ?? '—'
		},
		{
			id: 'supplier',
			header: m.inv_po_select_supplier(),
			field: 'supplierName',
			filterable: false,
			format: (_v, row) => (row as PoRowLite).supplierName ?? '—'
		},
		{
			id: 'store',
			header: m.inv_grn_receiving_store(),
			field: 'storeName',
			filterable: false,
			format: (_v, row) => (row as PoRowLite).storeName ?? '—'
		},
		{
			id: 'status',
			header: m.status(),
			field: 'statusName',
			filterable: false,
			format: (_v, row) => (row as PoRowLite).statusName ?? '—'
		},
		{
			id: 'total',
			header: m.inv_picker_po_total(),
			field: 'totalAmount',
			filterable: false,
			format: (_v, row) => {
				const t = (row as PoRowLite).totalAmount?.trim();
				return t ? trimInventoryNumericDisplay(t, 2) : '—';
			}
		},
		{
			id: 'items',
			header: m.inv_common_item(),
			field: 'itemNames',
			filterable: false,
			cellClass: 'whitespace-pre-line align-top max-w-xs',
			format: (_v, row) =>
				pickerCsvItemLines((row as PoRowLite).itemNames)
		}
	]);

	async function loadEligiblePos() {
		if (!hospitalId) return;
		try {
			const sp = new URLSearchParams();
			sp.set('pageSize', '150');
			if (selectedInventoryFromStoreId != null) {
				sp.set('storeId', String(selectedInventoryFromStoreId));
			}
			const poRes = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/purchase-order?${sp.toString()}`,
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
					p.statusTaggingId ===
						InvPoStatusTaggingEnum.SENT_TO_SUPPLIER ||
					p.statusTaggingId ===
						InvPoStatusTaggingEnum.PARTIALLY_RECEIVED
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
					`/api/medora/hospital/${hospitalId}/home/inventory/grn?mode=receivingStoreForPo&poId=${encodeURIComponent(poId)}`,
					{ method: 'GET' }
				),
				fetch(
					`/api/medora/hospital/${hospitalId}/home/inventory/purchase-order?id=${encodeURIComponent(poId)}`,
					{ method: 'GET' }
				)
			]);

			let storeBody: unknown = null;
			try {
				storeBody = await storeRes.json();
			} catch (e) {
				toastService.addErrorToast(
					'Could not load receiving store',
					e
				);
			}

			if (!storeRes.ok) {
				const msg =
					storeBody &&
					typeof storeBody === 'object' &&
					'message' in storeBody &&
					typeof (storeBody as { message: unknown }).message ===
						'string'
						? (storeBody as { message: string }).message
						: typeof storeBody === 'object' &&
							  storeBody &&
							  'error' in storeBody
							? String((storeBody as { error: unknown }).error)
							: `HTTP ${storeRes.status}`;
				receivingStoreHint = msg;
				toastService.addToast(
					'Could not load receiving store',
					StatusColorEnum.ERROR,
					msg
				);
			} else if (
				storeBody != null &&
				typeof storeBody === 'object' &&
				'storeId' in storeBody &&
				typeof (storeBody as { storeId: unknown }).storeId ===
					'number'
			) {
				receivingStore = storeBody as ReceivingStore;
			} else {
				receivingStoreHint =
					'Could not resolve receiving store for this PO (e.g. missing PR link for PR-backed orders).';
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
					purchasedQty: rem > 0 ? String(rem) : '0',
					batchNo: '',
					expiryDate: '',
					purchasePrice: ln.unitPrice ?? '',
					freeQty: '0',
					freeUnitId: ln.unitId,
					freeUnitIumId: ln.itemUnitMasterId ?? null,
					discountAmount: '0',
					discountPercent: '0',
					taxAmount: '0',
					taxPercent: '0'
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
				purchasedQty: trimField(f.purchasedQty),
				batchNo: trimField(f.batchNo) || null,
				expiryDate: trimField(f.expiryDate) || null,
				purchasePrice: trimField(f.purchasePrice) || null,
				freeQty: trimField(f.freeQty) || null,
				freeUnitId: f.freeUnitId ?? null,
				freeUnitIumId: f.freeUnitIumId ?? null,
				discountAmount: trimField(f.discountAmount) || null,
				discountPercent: trimField(f.discountPercent) || null,
				taxAmount: trimField(f.taxAmount) || null,
				taxPercent: trimField(f.taxPercent) || null
			}))
			.filter((l) => Number(l.purchasedQty) > 0);
		if (lines.length === 0) {
			toastService.addToast(
				'Could not post GRN',
				StatusColorEnum.ERROR,
				'Enter purchased quantity on at least one line.'
			);
			return;
		}
		const lnById = new Map(poLines.map((l) => [l.id, l]));
		for (const l of lines) {
			const meta = lnById.get(l.poLineId);
			if (!l.batchNo || !l.expiryDate || !l.purchasePrice) {
				toastService.addToast(
					'Could not post GRN',
					StatusColorEnum.ERROR,
					`Batch fields missing for: ${meta?.itemName ?? `PO line ${l.poLineId}`}.`
				);
				return;
			}
		}
		submitting = true;
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/grn`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						poId: selectedPoId,
						storeId: receivingStore.storeId,
						receivedDate,
						invoiceNo: trimField(invoiceNo) || null,
						invoiceDate: trimField(invoiceDate) || null,
						invoiceAmount: trimField(invoiceAmount) || null,
						invoiceDiscountAmount:
							trimField(invoiceDiscountAmount) || null,
						invoiceDiscountPercent:
							trimField(invoiceDiscountPercent) || null,
						invoiceTaxAmount: trimField(invoiceTaxAmount) || null,
						invoiceTaxPercent: trimField(invoiceTaxPercent) || null,
						invoicePhotoUrl: invoicePhotoUrl?.trim() || null,
						receivedBy: receivedByUserId ?? null,
						lines
					})
				}
			);
			if (!res.ok) {
				toastService.addToast(
					'Could not post GRN',
					StatusColorEnum.ERROR,
					await res.text()
				);
				return;
			}
			selectedPoId = null;
			receivingStore = null;
			receivingStoreHint = null;
			poLines = [];
			lineForms = [];
			invoiceNo = '';
			invoiceDate = '';
			invoiceAmount = '';
			resetInvoiceCharges();
			invoicePhotoUrl = null;
			receivedByUserId = layoutSessionUser.id;
			await goBackToGrnList();
		} catch (e) {
			toastService.addErrorToast('Could not post GRN', e);
		} finally {
			submitting = false;
		}
	}

	async function submitGrnDirect() {
		const storeId = selectedInventoryFromStoreId ?? directStoreId;
		if (!hospitalId || storeId == null || directSupplierId == null) {
			toastService.addToast(
				'Could not post GRN',
				StatusColorEnum.ERROR,
				'Choose From store in the top bar and select a supplier.'
			);
			return;
		}
		const lines: {
			itemId: number;
			unitId: number;
			purchasedQty: string;
			batchNo: string | null;
			expiryDate: string | null;
			purchasePrice: string | null;
			freeQty?: string | null;
			freeUnitId?: number | string | null;
			discountAmount?: string | null;
			discountPercent?: string | null;
			taxAmount?: string | null;
			taxPercent?: string | null;
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
			const rq = trimField(ln.purchasedQty);
			if (!Number.isFinite(Number(rq)) || Number(rq) <= 0) {
				toastService.addToast(
					'Could not post GRN',
					StatusColorEnum.ERROR,
					'Invalid quantity.'
				);
				return;
			}
			if (
				!trimField(ln.batchNo) ||
				!trimField(ln.expiryDate) ||
				!trimField(ln.purchasePrice)
			) {
				toastService.addToast(
					'Could not post GRN',
					StatusColorEnum.ERROR,
					'Batch number, expiry, and purchase price are required.'
				);
				return;
			}
			lines.push({
				itemId: ln.itemId,
				unitId,
				purchasedQty: rq,
				batchNo: trimField(ln.batchNo) || null,
				expiryDate: trimField(ln.expiryDate) || null,
				purchasePrice: trimField(ln.purchasePrice) || null,
				freeQty: trimField(ln.freeQty) || null,
				freeUnitId: ln.freeUnitId ?? null,
				freeUnitIumId: ln.freeUnitIumId ?? null,
				discountAmount: trimField(ln.discountAmount) || null,
				discountPercent: trimField(ln.discountPercent) || null,
				taxAmount: trimField(ln.taxAmount) || null,
				taxPercent: trimField(ln.taxPercent) || null
			});
		}
		if (lines.length === 0) {
			toastService.addToast(
				'Could not post GRN',
				StatusColorEnum.ERROR,
				'Add at least one line.'
			);
			return;
		}
		submitting = true;
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/inventory/grn`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						mode: 'direct',
						storeId,
						supplierId: directSupplierId,
						receivedDate,
						invoiceNo: trimField(invoiceNo) || null,
						invoiceDate: trimField(invoiceDate) || null,
						invoiceAmount: trimField(invoiceAmount) || null,
						invoiceDiscountAmount:
							trimField(invoiceDiscountAmount) || null,
						invoiceDiscountPercent:
							trimField(invoiceDiscountPercent) || null,
						invoiceTaxAmount: trimField(invoiceTaxAmount) || null,
						invoiceTaxPercent: trimField(invoiceTaxPercent) || null,
						invoicePhotoUrl: invoicePhotoUrl?.trim() || null,
						receivedBy: receivedByUserId ?? null,
						lines
					})
				}
			);
			if (!res.ok) {
				toastService.addToast(
					'Could not post GRN',
					StatusColorEnum.ERROR,
					await res.text()
				);
				return;
			}
			directLines = [];
			directStoreId = null;
			directSupplierId = null;
			grnFormMode = 'fromPo';
			invoiceNo = '';
			invoiceDate = '';
			invoiceAmount = '';
			resetInvoiceCharges();
			invoicePhotoUrl = null;
			receivedByUserId = layoutSessionUser.id;
			await goBackToGrnList();
		} catch (e) {
			toastService.addErrorToast('Could not post GRN', e);
		} finally {
			submitting = false;
		}
	}

	let lastGrnNewBootstrapKey = $state('');
	$effect(() => {
		const mode = page.url.searchParams.get('mode') ?? '';
		const key = `${hospitalId ?? ''}:${mode}:${selectedInventoryFromStoreId ?? ''}`;
		if (!hospitalId || key === lastGrnNewBootstrapKey) return;
		lastGrnNewBootstrapKey = key;
		if (mode === 'direct') {
			grnFormMode = 'direct';
			directStoreId = selectedInventoryFromStoreId;
			directSupplierId = null;
			directLines = [];
			receivedDate = new Date().toISOString().slice(0, 10);
		} else {
			grnFormMode = 'fromPo';
			void loadEligiblePos();
		}
		receivedByUserId = layoutSessionUser.id;
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
				purchasedQty: f.purchasedQty,
				batchNo: f.batchNo,
				expiryDate: f.expiryDate,
				purchasePrice: f.purchasePrice,
				itemName: meta?.itemName ?? null,
				itemUnitMasterId:
					typeof meta?.itemUnitMasterId === 'number'
						? meta.itemUnitMasterId
						: null,
				itemUnitMasterConversion:
					meta?.itemUnitMasterConversion?.trim()
						? meta.itemUnitMasterConversion
						: null
			};
		})
	);

	const grnLineColumns = $derived.by(
		(): MenziesTableColumn<GrnLineTableRow>[] => [
			{
				id: 'item',
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
				format: (_v, row) => row.itemUnitMasterConversion ?? '—'
			},
			{
				id: 'purchasedQty',
				header: m.inv_grn_line_purchased_qty(),
				field: 'purchasedQty',
				format: (_v, row) => {
					const t = row.purchasedQty?.trim();
					return t ? trimMetricQtyDisplay(t) : '—';
				}
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
				format: (_v, row) => {
					const t = String(row.purchasePrice ?? '').trim();
					return t ? trimInventoryNumericDisplay(t, 4) : '—';
				}
			}
		]
	);
</script>

<WashCard>
	<WashCardBody>
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
				<div class="mb-4 flex items-center gap-2">
					<WashTooltip
						tooltipText={m.inv_common_back_to_list()}
						className="tooltip-ghost"
					>
						<WashButton
							type="button"
							className="btn-sm btn-ghost btn-square"
							onClick={() => void goBackToGrnList()}
						>
							<LucideArrowLeft className="size-4" />
						</WashButton>
					</WashTooltip>
					<WashCardBodyTitle className="mb-0 min-w-0">
						{grnFormMode === 'direct'
							? m.inv_grn_new_direct_title()
							: m.inv_grn_new_title()}
					</WashCardBodyTitle>
				</div>
			</fieldset>

			{#snippet invoiceReceivingFields()}
				<div class={grnFieldsStack}>
					<GrnFormFieldRow label={m.inv_grn_invoice_no()}>
						<WashInputField inputType="text" bind:value={invoiceNo} />
					</GrnFormFieldRow>

					<GrnFormFieldRow label={m.inv_grn_invoice_date()}>
						<WashInputField inputType="date" bind:value={invoiceDate} />
					</GrnFormFieldRow>

					<GrnFormFieldRow label={m.inv_grn_invoice_amount()}>
						<WashInputField
							inputType="number"
							step="0.01"
							inputPlaceholderText="0.00"
							bind:value={invoiceAmount}
						/>
					</GrnFormFieldRow>

					<GrnInvoiceChargeFields
						bind:invoiceDiscountAmount
						bind:invoiceDiscountPercent
						bind:invoiceTaxAmount
						bind:invoiceTaxPercent
					/>

					<GrnFormFieldRow
						label={m.inv_grn_invoice_file()}
						alignStart={true}
					>
						<div>
							<input
								type="file"
								class="file-input-bordered file-input w-full"
								accept="image/*,application/pdf"
								disabled={invoicePhotoUploading}
								onchange={(e) => {
									const input = e.currentTarget as HTMLInputElement;
									const file = input.files?.[0] ?? null;
									if (!file) return;
									void uploadInvoicePhoto(file);
									input.value = '';
								}}
							/>

							{#if invoicePhotoUrl}
								<div class="mt-2 flex flex-wrap items-center gap-3">
									<span class="text-sm text-base-content/70"
										>{m.inv_grn_invoice_uploaded()}</span
									>
									<WashTooltip
										tooltipText={m.inv_common_remove_line()}
										className="tooltip-error"
									>
										<WashButton
											type="button"
											className="btn-sm btn-ghost btn-square text-error"
											onClick={() => {
												invoicePhotoUrl = null;
											}}
										>
											<LucideTrash2 className="size-4" />
										</WashButton>
									</WashTooltip>
								</div>

								{#if isInvoicePhotoPreviewable}
									<div class="mt-2">
										<img
											src={invoicePhotoUrl}
											alt=""
											class="max-h-24 rounded-box border border-base-200"
											loading="lazy"
										/>
									</div>
								{/if}
							{/if}
						</div>
					</GrnFormFieldRow>
				</div>
			{/snippet}

			{#snippet postGrnSubmitBar(fromPoMode: boolean)}
				<div
					class="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-base-200 pt-6"
				>
					<WashButton
						type="submit"
						className="btn-primary btn-wide"
						disabled={submitting ||
							(fromPoMode
								? lineForms.length === 0
								: directLines.length === 0)}
					>
						{m.inv_grn_submit()}
					</WashButton>
				</div>
			{/snippet}

			{#if grnFormMode === 'fromPo'}
				<div class={grnHeaderGridFromPo}>
					<div class="min-w-0">
						<div class={grnSectionPanel}>
							<p class={grnSectionTitle}>
								{m.inv_grn_section_supplier_invoice()}
							</p>
							{@render invoiceReceivingFields()}
						</div>
					</div>

					<div class="min-w-0">
						<div class={grnSectionPanel}>
							<p class={grnSectionTitle}>
								{m.inv_grn_section_receipt()}
							</p>
							<div class={grnFieldsStack}>
								<GrnFormFieldRow label={m.inv_grn_select_po()}>
									<div
										class="flex min-w-0 flex-wrap items-stretch gap-2 sm:flex-nowrap"
									>
										<input
											type="text"
											readonly
											disabled
											class="input-bordered input min-w-0 flex-1 text-sm"
											value={selectedPoSummary || '—'}
											aria-label={m.inv_grn_select_po()}
										/>
										<WashButton
											type="button"
											className="btn-outline shrink-0"
											disabled={poPickerBusy}
											loading={poPickerBusy}
											onClick={() => void openPoPicker()}
										>
											{m.inv_common_btn_select()}
										</WashButton>
									</div>
								</GrnFormFieldRow>

								<GrnFormFieldRow label={m.inv_grn_received_date()}>
									<WashInputField
										inputType="date"
										bind:value={receivedDate}
									/>
								</GrnFormFieldRow>

								<GrnFormFieldRow label={m.inv_common_received_by()}>
									<WashSearchSelect
										value={receivedByUserId ?? ''}
										searchFn={searchReceivedByUsers}
										getLabelForValue={getReceivedByLabelForValue}
										invalidateKey={hospitalId}
										onChange={(v: string) => {
											receivedByUserId = v.trim() ? v.trim() : null;
										}}
										placeholder={m.inv_grn_received_by_placeholder()}
										className="w-full"
									/>
								</GrnFormFieldRow>

								<GrnFormFieldRow label={m.inv_grn_receiving_store()}>
									{#if receivingStore}
										<input
											type="text"
											readonly
											disabled
											class="input-bordered input w-full text-sm"
											value={receivingStore.storeName ?? '—'}
											aria-label={m.inv_grn_receiving_store()}
										/>
									{:else if selectedPoId}
										<input
											type="text"
											readonly
											disabled
											class="input-bordered input w-full text-sm"
											value="—"
											aria-label={m.inv_grn_receiving_store()}
										/>
										{#if receivingStoreHint}
											<div
												class="mt-2 alert text-sm alert-warning"
												role="status"
											>
												{receivingStoreHint}
											</div>
										{/if}
									{:else}
										<input
											type="text"
											readonly
											disabled
											class="input-bordered input w-full text-sm opacity-60"
											value="—"
											aria-label={m.inv_grn_receiving_store()}
										/>
									{/if}
								</GrnFormFieldRow>
							</div>
						</div>
					</div>
				</div>
				{@render postGrnSubmitBar(true)}
			{:else}
				{#snippet directLinesToolbarRight()}
					<WashTooltip
						tooltipText={m.inv_line_items_add()}
						className="tooltip-ghost"
					>
						<WashButton
							type="button"
							className="btn-primary btn-square btn-outline btn-sm"
							title={m.inv_line_items_add()}
							onClick={() => void openDirectLineDialogForCreate()}
						>
							<LucidePlus className="size-4" />
						</WashButton>
					</WashTooltip>
				{/snippet}
				<div class={grnHeaderGridDirect}>
					<div class="min-w-0">
						<div class={grnSectionPanel}>
							<p class={grnSectionTitle}>
								{m.inv_grn_section_supplier_invoice()}
							</p>
							{@render invoiceReceivingFields()}
						</div>
					</div>

					<div class="min-w-0">
						<div class={grnSectionPanel}>
							<p class={grnSectionTitle}>
								{m.inv_grn_section_receipt()}
							</p>
							<div class={grnFieldsStack}>
								<GrnFormFieldRow label={m.inv_grn_receiving_store()}>
									<div>
										<input
											type="text"
											readonly
											disabled
											class="input-bordered input w-full text-sm"
											value={navReceivingStoreLabel}
											aria-label={m.inv_grn_receiving_store()}
										/>
										{#if selectedInventoryFromStoreId == null}
											<div
												class="mt-2 alert text-sm alert-warning"
												role="status"
											>
												{m.inv_inventory_from_store_topbar_hint()}
											</div>
										{/if}
									</div>
								</GrnFormFieldRow>

								<GrnFormFieldRow label={m.inv_grn_received_date()}>
									<WashInputField
										inputType="date"
										bind:value={receivedDate}
									/>
								</GrnFormFieldRow>

								<GrnFormFieldRow label={m.inv_common_received_by()}>
									<WashSearchSelect
										value={receivedByUserId ?? ''}
										searchFn={searchReceivedByUsers}
										getLabelForValue={getReceivedByLabelForValue}
										invalidateKey={hospitalId}
										onChange={(v: string) => {
											receivedByUserId = v.trim() ? v.trim() : null;
										}}
										placeholder={m.inv_grn_received_by_placeholder()}
										className="w-full"
									/>
								</GrnFormFieldRow>
							</div>
						</div>
					</div>

					<div class="min-w-0">
						<div class={grnSectionPanel}>
							<p class={grnSectionTitle}>
								{m.inv_po_supplier_search()}
							</p>
							<div class={grnFieldsStack}>
								<GrnFormFieldRow label={m.inv_po_select_supplier()}>
									<WashSearchSelect
										value={directSupplierId != null
											? String(directSupplierId)
											: ''}
										searchFn={async (q: string) => {
											const qEnc = encodeURIComponent(q.trim());
											const res = await fetch(
												`/api/medora/hospital/${hospitalId}/home/inventory-setup/supplier-setup?mode=search&q=${qEnc}&limit=30`
											);
											const j = await res.json();
											return (j ?? []).map(
												(s: { id: number; name: string | null }) => ({
													label: s.name ?? '—',
													value: String(s.id)
												})
											);
										}}
										onChange={(v: string) => {
											directSupplierId = v ? Number(v) : null;
										}}
										placeholder={m.inv_po_supplier_search()}
										className="w-full"
									/>
								</GrnFormFieldRow>
							</div>
						</div>
					</div>
				</div>
				{@render postGrnSubmitBar(false)}

				<GrnDirectLinesCard
					totalCount={directLines.length}
					columns={directLineTableColumns}
					rows={directLines}
					useColumnFilters={true}
					hideQuickFilter={true}
					hideAddButton={true}
					toolbarRight={directLinesToolbarRight}
					onAddItem={() => void openDirectLineDialogForCreate()}
					onEditLine={(line) =>
						void openDirectLineDialogForEdit(line)}
					onDeleteLine={deleteDirectLine}
				/>
			{/if}

			{#if grnFormMode === 'fromPo' && lineForms.length > 0}
				<div class="mt-8">
					<div class="mb-3">
						<h3 class="text-lg font-medium text-base-content/90">
							Items Received
						</h3>
					</div>
					<div class="h-[420px] min-h-0 w-full">
						<MenziesTable
							columns={grnLineColumns as MenziesTableColumn[]}
							rows={grnLineTableRows}
							isLoading={false}
							showRowActions={true}
							actionsVariant="none"
							showRefreshButton={false}
							enableColumnFilters={false}
						>
							{#snippet rowActions(row, _rowIndex)}
								{@const line = row as GrnLineTableRow}
								<div class="flex flex-col items-center gap-1">
									<WashTooltip
										tooltipText={m.inv_line_items_tooltip_edit()}
										className="tooltip-accent"
									>
										<WashButton
											type="button"
											className="btn-sm btn-ghost btn-square text-accent"
											onClick={() =>
												void openGrnFromPoLineDialog(line.poLineId)}
										>
											<LucidePencil className="size-5" />
										</WashButton>
									</WashTooltip>
									<WashTooltip
										tooltipText={m.inv_common_remove_line()}
										className="tooltip-error"
									>
										<WashButton
											type="button"
											className="btn-sm btn-ghost btn-square text-error"
											onClick={() =>
												removeGrnFromPoLine(line.poLineId)}
										>
											<LucideTrash2 className="size-5" />
										</WashButton>
									</WashTooltip>
								</div>
							{/snippet}
						</MenziesTable>
					</div>
				</div>
			{:else if grnFormMode === 'fromPo' && selectedPoId && lineForms.length === 0 && poLines.length > 0}
				<div
					class="mt-8 rounded-box border border-dashed border-base-300 bg-base-200/30 px-4 py-3 text-sm text-base-content/80"
				>
					All lines were removed. Reselect the purchase order to
					restore lines, or pick a different PO.
				</div>
			{/if}
		</form>
	</WashCardBody>
</WashCard>
