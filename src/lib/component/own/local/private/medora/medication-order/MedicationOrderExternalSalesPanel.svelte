<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import LucideListOrdered from '$lib/component/own/library/lucide/LucideListOrdered.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import MenziesTable, {
		type MenziesTableColumn
	} from '$lib/component/own/library/menzies/table/MenziesTable.svelte';
	import MenziesTableIconAction from '$lib/component/own/library/menzies/table/MenziesTableIconAction.svelte';
	import MenziesTableRowActionGroup from '$lib/component/own/library/menzies/table/MenziesTableRowActionGroup.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { m } from '$lib/paraglide/messages';
	import { DOCUMENT_PRINT_CODE } from '$lib/model/constant/document-print.constant';
	import { printFromDocumentMaster } from '$lib/util/document-master-print.util.svelte';
	import {
		buildMedOrderReceiptBodyHtml,
		type MedOrderReceiptPrintLabels
	} from '$lib/util/op-billing-print-table.util';
	import type {
		ItemNamePriceRow,
		MedicationOrderCheckoutResponse,
		MedicationOrderMastersResponse,
		MedicationOrderLineInput
	} from '$lib/model/type/medora/medication-order.type';
	import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/medora/department-consumption-detail.type';
	import type { ConsumptionDraftLineIum } from '$lib/model/type/medora/department-consumption-detail.type';
	import { EXTERNAL_SALES_PRICING_MODULE } from '$lib/model/type/medora/inv-pricing-module.type';
	import MedicationOrderInventoryFields from '$lib/component/own/local/private/medora/medication-order/MedicationOrderInventoryFields.svelte';
	import MedicationOrderHistoryDialogContent from '$lib/component/own/local/private/medora/medication-order/MedicationOrderHistoryDialogContent.svelte';
	import {
		hydrateMedOrderItemMeta,
		lineTotal,
		loadMedOrderIumList,
		refreshMedOrderBatchAllocations,
		syncMedOrderFefoAllocations,
		validateMedOrderInventoryLine,
		applyDraftReservationsToLots
	} from '$lib/tool/medication-order/med-order-line-inventory.util';
	import { resolveMedOrderIumForOutUnit } from '$lib/tool/inventory/med-order-out-qty.util';
	import { formatMedOrderItemSearchLabel } from '$lib/tool/medication-order/format-med-order-item-search-label.util';
	import {
		isMedOrderStartBeforeToday,
		medOrderMinStartDateTimeLocal
	} from '$lib/tool/medication-order/med-order-start-date.util';
	import { tick, untrack } from 'svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	function apiRoot() {
		return `/api/medora/hospital/${hospitalId}/home/medication-order/external-sales`;
	}

	/** Walk-in: plain text, not linked to a patient/visit */
	let customerName = $state('');
	let advisingDoctor = $state('');

	function toDateTimeLocalValue(d: Date): string {
		const y = d.getFullYear();
		const mo = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const h = String(d.getHours()).padStart(2, '0');
		const min = String(d.getMinutes()).padStart(2, '0');
		return `${y}-${mo}-${day}T${h}:${min}`;
	}

	function parseDateTimeLocalToIso(s: string): string {
		return new Date(s).toISOString();
	}

	let masters = $state<MedicationOrderMastersResponse | null>(null);

	let storeIdStr = $state('');
	const storeId = $derived(
		Number.isFinite(Number(storeIdStr)) && Number(storeIdStr) > 0
			? Number(storeIdStr)
			: 0
	);
	let storeLabel = $state('');

	let pharmacyGenerics = $state<
		{ id: number; name: string; code: string | null }[]
	>([]);
	let pharmacyGenericId = $state('');

	let itemValueStr = $state('');
	let lastItemSearchRows = $state<ItemNamePriceRow[]>([]);
	let selectedItem = $state<ItemNamePriceRow | null>(null);

	const itemFilterKey = $derived(
		`${storeIdStr}|${pharmacyGenericId}`
	);
	let prevItemFilterKey = $state<string | null>(null);

	let dose = $state('1');
	let doseUnitIdStr = $state('');
	let frequencyIdStr = $state('');

	let durationValue = $state('1');
	let durationUnitIdStr = $state('');

	let formId = $state('');
	let routeId = $state('');
	let orderTypeId = $state('');
	let foodRelationId = $state('');

	let startAtLocal = $state('');

	let testDose = $state('');
	let substituteNotAllowed = $state(false);

	let qtyOut = $state('');
	let outUnitIdStr = $state('');
	let itemUnitMasterIdStr = $state('');
	let unitSalePrice = $state('0');
	let batchAllocations = $state<ConsumptionBatchAllocationDraft[]>([]);
	let iumList = $state<ConsumptionDraftLineIum[]>([]);

	let paymentMethod = $state('cash');
	let amountPaid = $state('');
	let batchIsPaid = $state(false);

	let isBusy = $state(false);
	let editingBatchId = $state(0);
	/** When set, Add to cart updates this draft line instead of appending. */
	let editingLineKey = $state<string | null>(null);
	let showRxDetails = $state(false);

	type DraftLine = MedicationOrderLineInput & {
		_key: string;
		_itemName: string;
		_freqLabel: string;
		_batchAllocations: ConsumptionBatchAllocationDraft[];
		_iumList: ConsumptionDraftLineIum[];
	};

	const draftTotal = $derived.by(() => {
		let s = 0;
		for (const ln of draftLines) {
			s += lineTotal(ln.qtyOut, ln.unitSalePrice);
		}
		return s.toFixed(2);
	});

	let draftLines = $state<DraftLine[]>([]);
	let draftCurrentPage = $state(1);
	let draftPageSizeStr = $state('10');
	let draftColumnFilters = $state<Record<string, string>>({});

	/** Store labels for edit / display (history dialog loads its own copy). */
	let storeNameById = $state<Record<number, string>>({});

	const genericOptions = $derived.by(() => {
		const opts: { value: string; label: string }[] = [
			{ value: '', label: m.med_order_int_all_generics() }
		];
		for (const g of pharmacyGenerics) {
			const label = g.code?.trim() ? `${g.name} (${g.code})` : g.name;
			opts.push({ value: String(g.id), label });
		}
		return opts;
	});

	const doseUnitOptions = $derived.by(() =>
		(masters?.doseUnits ?? []).map((u) => ({
			value: String(u.id),
			label: u.name?.trim() || '—'
		}))
	);
	const durationUnitOptions = $derived.by(() =>
		(masters?.durUnits ?? []).map((u) => ({
			value: String(u.id),
			label: `${u.name?.trim() || '—'} (${u.code})`
		}))
	);
	const formOptions = $derived.by(() => [
		{ value: '', label: m.med_order_int_not_applicable() },
		...(masters?.forms ?? []).map((u) => ({
			value: String(u.id),
			label: u.name?.trim() || '—'
		}))
	]);
	const routeOptions = $derived.by(() => [
		{ value: '', label: m.med_order_int_not_applicable() },
		...(masters?.routes ?? []).map((u) => ({
			value: String(u.id),
			label: u.name?.trim() || '—'
		}))
	]);
	const orderTypeOptions = $derived.by(() => [
		{ value: '', label: m.med_order_int_not_applicable() },
		...(masters?.orderTypes ?? []).map((u) => ({
			value: String(u.id),
			label: u.name?.trim() || '—'
		}))
	]);
	const foodRelOptions = $derived.by(() => [
		{ value: '', label: m.med_order_int_not_applicable() },
		...(masters?.foodRels ?? []).map((u) => ({
			value: String(u.id),
			label: u.name?.trim() || '—'
		}))
	]);
	const frequencyOptions = $derived.by(() =>
		(masters?.freqs ?? []).map((f) => ({
			value: String(f.id),
			label: f.summaryText?.trim()
				? `${f.label?.trim() || '—'} · ${f.summaryText.trim()}`
				: f.label?.trim() || '—'
		}))
	);

	const partyReady = $derived(
		Boolean(editingBatchId) || customerName.trim().length > 0
	);
	const minStart = $derived.by(() => medOrderMinStartDateTimeLocal());

	async function loadMasters() {
		if (!hospitalId) return;
		const res = await fetch(`${apiRoot()}?mode=masters`, {
			credentials: 'include'
		});
		if (!res.ok) return;
		masters = (await res.json()) as MedicationOrderMastersResponse;
		if (masters.durUnits[0] && !durationUnitIdStr) {
			durationUnitIdStr = String(masters.durUnits[0].id);
		}
		if (masters.doseUnits[0] && !doseUnitIdStr) {
			doseUnitIdStr = String(masters.doseUnits[0].id);
		}
		if (masters.freqs[0] && !frequencyIdStr) {
			frequencyIdStr = String(masters.freqs[0].id);
		}
	}

	async function loadPharmacyGenerics() {
		if (!hospitalId) return;
		const url = new URL(
			`/api/medora/hospital/${hospitalId}/home/inventory-setup/pharmacy-generic`,
			window.location.origin
		);
		url.searchParams.set('page', '1');
		url.searchParams.set('pageSize', '500');
		const res = await fetch(url, { credentials: 'include' });
		if (!res.ok) return;
		const pack = (await res.json()) as {
			data: { id: number; name: string; code: string | null }[];
		};
		pharmacyGenerics = pack.data ?? [];
	}

	async function resolveStoreLabelForId(
		idStr: string
	): Promise<string> {
		if (!idStr || !hospitalId) return '';
		const u = new URL(apiRoot(), window.location.origin);
		u.searchParams.set('mode', 'stores.search');
		const res = await fetch(u, { credentials: 'include' });
		if (!res.ok) return `Store #${idStr}`;
		const rows = (await res.json()) as {
			id: number;
			storeName: string | null;
		}[];
		const hit = rows.find((r) => String(r.id) === idStr);
		return hit
			? hit.storeName?.trim() || `#${hit.id}`
			: `Store #${idStr}`;
	}

	async function searchStoresForSelect(query: string) {
		if (!hospitalId) return [];
		const u = new URL(apiRoot(), window.location.origin);
		u.searchParams.set('mode', 'stores.search');
		if (query.trim()) u.searchParams.set('name', query.trim());
		const res = await fetch(u, { credentials: 'include' });
		if (!res.ok) return [];
		const rows = (await res.json()) as {
			id: number;
			storeName: string | null;
		}[];
		return rows.map((s) => ({
			value: String(s.id),
			label: s.storeName?.trim() || `Store #${s.id}`
		}));
	}

	async function searchItemsFromMaster(query: string) {
		if (!hospitalId || !storeId) {
			lastItemSearchRows = [];
			return [];
		}
		const u = new URL(apiRoot(), window.location.origin);
		u.searchParams.set('mode', 'items.search');
		u.searchParams.set('storeId', String(storeId));
		if (query.trim()) u.searchParams.set('search', query.trim());
		if (pharmacyGenericId) {
			u.searchParams.set('pharmacyGenericId', pharmacyGenericId);
		}
		const res = await fetch(u, { credentials: 'include' });
		if (!res.ok) {
			lastItemSearchRows = [];
			return [];
		}
		const rows = (await res.json()) as ItemNamePriceRow[];
		lastItemSearchRows = rows;
		return rows.map((it) => ({
			value: String(it.id),
			label: formatMedOrderItemSearchLabel(it)
		}));
	}

	async function getItemLabelForValue(
		idStr: string
	): Promise<string> {
		if (!idStr) return '';
		const fromSearch = lastItemSearchRows.find(
			(r) => String(r.id) === idStr
		);
		if (fromSearch) return formatMedOrderItemSearchLabel(fromSearch);
		if (selectedItem && String(selectedItem.id) === idStr) {
			return formatMedOrderItemSearchLabel(selectedItem);
		}
		if (!hospitalId) return `Item #${idStr}`;
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?id=${encodeURIComponent(idStr)}`,
			{ credentials: 'include' }
		);
		if (!res.ok) return `Item #${idStr}`;
		const d = (await res.json()) as { itemName?: string | null };
		return d.itemName?.trim() || `Item #${idStr}`;
	}

	const draftColumns = $derived.by((): MenziesTableColumn<DraftLine>[] => {
		const ps = Number(draftPageSizeStr) || 25;
		return [
			{
				id: 'idx',
				header: m.med_order_int_draft_index(),
				widthClass: 'w-12',
				filterable: false,
				format: (_v, _row, rowIndex) =>
					String((draftCurrentPage - 1) * ps + rowIndex + 1)
			},
			{
				id: 'item',
				header: m.med_order_int_item(),
				widthClass: 'min-w-[10rem]',
				filterable: true,
				format: (_v, row) => row._itemName
			},
			{
				id: 'qty',
				header: m.med_order_sale_qty(),
				widthClass: 'w-24',
				filterable: true,
				format: (_v, row) => row.qtyOut
			},
			{
				id: 'price',
				header: m.med_order_unit_sale_price(),
				widthClass: 'w-28',
				filterable: true,
				format: (_v, row) => row.unitSalePrice
			},
			{
				id: 'total',
				header: m.med_order_amount_due(),
				widthClass: 'w-28',
				filterable: false,
				format: (_v, row) =>
					lineTotal(row.qtyOut, row.unitSalePrice).toFixed(2)
			}
		];
	});

	$effect(() => {
		const k = itemFilterKey;
		if (prevItemFilterKey != null && k !== prevItemFilterKey) {
			untrack(() => {
				itemValueStr = '';
				selectedItem = null;
			});
		}
		prevItemFilterKey = k;
	});

	$effect(() => {
		if (hospitalId) {
			untrack(() => {
				if (!startAtLocal) {
					startAtLocal = toDateTimeLocalValue(new Date());
				}
			});
		}
	});

	lifeCycleUtil.onMount(() => {
		if (hospitalId) {
			void loadMasters();
			void loadPharmacyGenerics();
		}
	});

	async function onStoreSearchChange(v: string) {
		storeLabel = v ? await resolveStoreLabelForId(v) : '';
	}

	async function getStoreLabelForValue(v: string): Promise<string> {
		if (!v) return '';
		if (v === storeIdStr && storeLabel) return storeLabel;
		return resolveStoreLabelForId(v);
	}

	async function hydrateInventoryForItem(itemId: number) {
		if (!hospitalId || storeId <= 0) return;
		try {
			const meta = await hydrateMedOrderItemMeta(hospitalId, itemId);
			const ium = await loadMedOrderIumList(
				hospitalId,
				meta.itemUnitMasterIds,
				meta.defaultItemUnitMasterId
			);
			iumList = ium.iumList;
			itemUnitMasterIdStr =
				ium.itemUnitMasterId != null
					? String(ium.itemUnitMasterId)
					: '';
			const lots = await refreshMedOrderBatchAllocations(
				hospitalId,
				storeId,
				itemId
			);
			batchAllocations = applyDraftReservationsToLots(
				lots,
				draftLines,
				itemId,
				resolveMedOrderIumForOutUnit(
					iumList,
					Number(outUnitIdStr) || 0,
					Number(itemUnitMasterIdStr) || null
				)
			);
			qtyOut = '';
			outUnitIdStr = '';
		} catch (e) {
			toastService.addErrorToast(m.med_order_inventory_invalid(), e);
			batchAllocations = [];
			iumList = [];
		}
	}

	async function onItemSearchChange(v: string) {
		itemValueStr = v;
		if (!v) {
			selectedItem = null;
			batchAllocations = [];
			iumList = [];
			return;
		}
		const row =
			lastItemSearchRows.find((r) => String(r.id) === v) ?? null;
		selectedItem = row;
		if (row) await hydrateInventoryForItem(row.id);
	}

	function hydrateFormFromLine(line: DraftLine) {
		editingLineKey = line._key;
		itemValueStr = String(line.itemMasterId);
		selectedItem = {
			id: line.itemMasterId,
			itemName: line._itemName,
			displayPrice: null,
			stockIssueQty: null,
			issueUnitName: null
		};
		const row: ItemNamePriceRow = {
			id: line.itemMasterId,
			itemName: line._itemName,
			displayPrice: null,
			stockIssueQty: null,
			issueUnitName: null
		};
		lastItemSearchRows = [
			row,
			...lastItemSearchRows.filter((r) => r.id !== line.itemMasterId)
		];
		dose = line.dose;
		doseUnitIdStr = String(line.doseUnitId);
		frequencyIdStr = String(line.frequencyId);
		durationValue = line.durationValue;
		durationUnitIdStr = String(line.durationUnitId);
		formId = line.formId != null ? String(line.formId) : '';
		routeId = line.routeId != null ? String(line.routeId) : '';
		orderTypeId = line.orderTypeId != null ? String(line.orderTypeId) : '';
		foodRelationId =
			line.foodRelationId != null ? String(line.foodRelationId) : '';
		startAtLocal = toDateTimeLocalValue(new Date(line.startAt));
		testDose = line.testDose ?? '';
		substituteNotAllowed = line.substituteNotAllowed;
		showRxDetails = true;
		qtyOut = line.qtyOut;
		outUnitIdStr = String(line.outUnitId);
		itemUnitMasterIdStr =
			line.itemUnitMasterId != null
				? String(line.itemUnitMasterId)
				: '';
		unitSalePrice = line.unitSalePrice;
		batchAllocations = line._batchAllocations.map((a) => ({ ...a }));
		iumList = [...line._iumList];
		if (line.itemUnitMasterId && hospitalId) {
			void (async () => {
				try {
					const meta = await hydrateMedOrderItemMeta(
						hospitalId,
						line.itemMasterId
					);
					const ium = await loadMedOrderIumList(
						hospitalId,
						meta.itemUnitMasterIds,
						line.itemUnitMasterId
					);
					iumList = ium.iumList;
					itemUnitMasterIdStr =
						line.itemUnitMasterId != null
							? String(line.itemUnitMasterId)
							: ium.itemUnitMasterId != null
								? String(ium.itemUnitMasterId)
								: '';
					if (batchAllocations.length === 0 && storeId > 0) {
						const lots = await refreshMedOrderBatchAllocations(
							hospitalId,
							storeId,
							line.itemMasterId
						);
						batchAllocations = applyDraftReservationsToLots(
							lots,
							draftLines.filter((d) => d._key !== line._key),
							line.itemMasterId,
							iumList[0] ?? null
						);
						for (const a of batchAllocations) {
							const saved = line._batchAllocations.find(
								(x) => x.batchId === a.batchId
							);
							if (saved) a.qtyPurchase = saved.qtyPurchase;
						}
					}
				} catch {
					/* keep draft allocations */
				}
			})();
		}
	}

	function resetLineInventoryFields() {
		qtyOut = '';
		outUnitIdStr = '';
		itemUnitMasterIdStr = '';
		unitSalePrice = '0';
		batchAllocations = [];
		iumList = [];
	}

	function ensureClinicalDefaults(): boolean {
		if (!masters) return false;
		dose = dose.trim() || '1';
		durationValue = durationValue.trim() || '1';
		if (masters.durUnits[0]) {
			durationUnitIdStr = String(masters.durUnits[0].id);
		}
		if (masters.doseUnits[0]) {
			doseUnitIdStr = String(masters.doseUnits[0].id);
		}
		if (masters.freqs[0]) {
			frequencyIdStr = String(masters.freqs[0].id);
		}
		startAtLocal = toDateTimeLocalValue(new Date());
		return (
			!!doseUnitIdStr &&
			!!frequencyIdStr &&
			!!durationUnitIdStr &&
			Number(doseUnitIdStr) > 0 &&
			Number(frequencyIdStr) > 0 &&
			Number(durationUnitIdStr) > 0
		);
	}

	function resetNewLineForm() {
		editingLineKey = null;
		itemValueStr = '';
		selectedItem = null;
		formId = '';
		routeId = '';
		orderTypeId = '';
		foodRelationId = '';
		testDose = '';
		substituteNotAllowed = false;
		ensureClinicalDefaults();
		resetLineInventoryFields();
	}

	function resetEditing() {
		editingBatchId = 0;
		draftLines = [];
		batchIsPaid = false;
		amountPaid = '';
		showRxDetails = false;
		resetNewLineForm();
	}

	function addDraft() {
		if (!partyReady) {
			toastService.addToast(
				m.med_order_ext_no_party(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (storeId <= 0) {
			toastService.addToast(
				m.med_order_int_no_store(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!selectedItem) {
			toastService.addToast(
				m.med_order_int_no_item(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!ensureClinicalDefaults()) {
			toastService.addToast(
				m.med_order_int_missing_master(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const doseUnitId = Number(doseUnitIdStr);
		const frequencyId = Number(frequencyIdStr);
		const durationUnitId = Number(durationUnitIdStr);
		const st = new Date(parseDateTimeLocalToIso(startAtLocal));
		if (isMedOrderStartBeforeToday(st)) {
			toastService.addToast(
				m.med_order_int_past_start(),
				StatusColorEnum.ERROR
			);
			return;
		}

		const outUnitId = Number(outUnitIdStr) || 0;
		const ium = resolveMedOrderIumForOutUnit(
			iumList,
			outUnitId,
			Number(itemUnitMasterIdStr) || null
		);
		if (!ium) {
			toastService.addToast(
				m.med_order_inventory_invalid(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const lotsForValidate = applyDraftReservationsToLots(
			batchAllocations,
			draftLines,
			selectedItem.id,
			ium
		);
		const syncedLots = syncMedOrderFefoAllocations({
			batchAllocations: lotsForValidate,
			qtyOut,
			outUnitId,
			ium
		});
		const invErr = validateMedOrderInventoryLine({
			batchAllocations: syncedLots,
			ium,
			qtyOut,
			outUnitId,
			unitSalePrice
		});
		if (invErr) {
			toastService.addToast(invErr, StatusColorEnum.ERROR);
			return;
		}
		const iumId = ium.id;
		const fRow = (masters?.freqs ?? []).find(
			(x) => x.id === frequencyId
		);
		const line: MedicationOrderLineInput = {
			itemMasterId: selectedItem.id,
			dose: dose.trim() || '1',
			doseUnitId,
			frequencyId,
			durationValue: durationValue.trim() || '1',
			durationUnitId,
			formId: formId ? Number(formId) : null,
			routeId: routeId ? Number(routeId) : null,
			orderTypeId: orderTypeId ? Number(orderTypeId) : null,
			foodRelationId: foodRelationId ? Number(foodRelationId) : null,
			startAt: parseDateTimeLocalToIso(startAtLocal),
			testDose: testDose.trim() || null,
			substituteNotAllowed,
			unitSalePrice: unitSalePrice.trim() || '0',
			qtyOut: qtyOut.trim(),
			outUnitId,
			itemUnitMasterId: iumId,
			allocations: syncedLots
				.filter((a) => Number(a.qtyPurchase) > 0)
				.map((a) => ({
					batchId: a.batchId,
					qtyPurchase: a.qtyPurchase
				}))
		};

		const nextDraft: DraftLine = {
			...line,
			_key: editingLineKey ?? `d-${Date.now()}-${Math.random()}`,
			_itemName:
				selectedItem.itemName ?? `Item #${selectedItem.id}`,
			_freqLabel: fRow?.label ?? '—',
			_batchAllocations: syncedLots.map((a) => ({ ...a })),
			_iumList: [...iumList]
		};
		if (editingLineKey) {
			draftLines = draftLines.map((d) =>
				d._key === editingLineKey ? nextDraft : d
			);
		} else {
			draftLines = [...draftLines, nextDraft];
		}
		resetNewLineForm();
	}

	function globalDraftIndex(localRowIndex: number): number {
		const ps = Number(draftPageSizeStr) || 25;
		return (draftCurrentPage - 1) * ps + localRowIndex;
	}

	function moveDraftLine(globalIndex: number, delta: -1 | 1) {
		const next = globalIndex + delta;
		if (next < 0 || next >= draftLines.length) return;
		const copy = [...draftLines];
		const t = copy[globalIndex]!;
		copy[globalIndex] = copy[next]!;
		copy[next] = t;
		draftLines = copy;
	}

	function removeDraft(k: string) {
		if (editingLineKey === k) {
			resetNewLineForm();
		}
		draftLines = draftLines.filter((d) => d._key !== k);
	}

	async function persistBatch() {
		if (!partyReady) {
			toastService.addToast(
				m.med_order_ext_no_party(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (storeId <= 0) {
			toastService.addToast(
				m.med_order_int_no_store(),
				StatusColorEnum.ERROR
			);
			return;
		}
		if (draftLines.length === 0) {
			toastService.addToast(
				m.med_order_int_draft_empty(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isBusy = true;
		const lines = draftLines.map((d) => {
			const {
				_key: _k,
				_itemName: _n,
				_freqLabel: _f,
				_batchAllocations: _a,
				_iumList: _i,
				...rest
			} = d;
			void _k;
			void _n;
			void _f;
			void _a;
			void _i;
			return rest;
		});
		try {
			if (editingBatchId) {
				const res = await fetch(apiRoot(), {
					method: 'POST',
					credentials: 'include',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						mode: 'batch.update',
						batchId: editingBatchId,
						lines
					})
				});
				if (!res.ok) await throwUserFacingHttpError(res);
				toastService.addToast(
					m.med_order_int_updated(),
					StatusColorEnum.SUCCESS
				);
				amountPaid = draftTotal;
				resetNewLineForm();
				await reloadDraftLinesFromSavedBatch(editingBatchId);
				amountPaid = draftTotal;
			} else {
				const res = await fetch(apiRoot(), {
					method: 'POST',
					credentials: 'include',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						mode: 'batch.save',
						storeId,
						extCustomerName: customerName.trim(),
						advisingDoctor: advisingDoctor.trim(),
						lines
					})
				});
				if (!res.ok) await throwUserFacingHttpError(res);
				const saved = (await res.json()) as {
					batch?: { id?: number };
				};
				if (saved.batch?.id) {
					editingBatchId = saved.batch.id;
				}
				toastService.addToast(
					m.med_order_int_saved(),
					StatusColorEnum.SUCCESS
				);
				resetNewLineForm();
				if (editingBatchId) {
					await reloadDraftLinesFromSavedBatch(editingBatchId);
				}
				amountPaid = draftTotal;
			}
		} catch (e) {
			toastService.addErrorToast(
				editingBatchId
					? m.med_order_int_update_failed()
					: m.med_order_int_save_failed(),
				e
			);
		} finally {
			isBusy = false;
		}
	}

	async function checkoutBatch() {
		if (!editingBatchId || batchIsPaid) return;
		if (!amountPaid.trim()) {
			toastService.addToast(
				m.med_order_amount_paid(),
				StatusColorEnum.ERROR
			);
			return;
		}
		isBusy = true;
		try {
			const res = await fetch(apiRoot(), {
				method: 'POST',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'batch.checkout',
					batchId: editingBatchId,
					paymentMethod,
					amountPaid: amountPaid.trim()
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			await res.json();
			batchIsPaid = true;
			toastService.addToast(
				m.med_order_checkout_success(),
				StatusColorEnum.SUCCESS
			);
			await openHistory();
		} catch (e) {
			toastService.addErrorToast(m.med_order_checkout_failed(), e);
		} finally {
			isBusy = false;
		}
	}

	async function printReceiptFromPack(r: MedicationOrderCheckoutResponse) {
		if (!hospitalId) return;
		const labels: MedOrderReceiptPrintLabels = {
			item: 'Item',
			qty: 'Qty',
			price: 'Price',
			total: 'Total',
			amountDue: m.med_order_amount_due(),
			amountPaid: m.med_order_amount_paid()
		};
		const bodyHtml = buildMedOrderReceiptBodyHtml({
			lines: r.lines,
			amountDue: r.amountDue,
			amountPaid: r.amountPaid,
			labels
		});

		await printFromDocumentMaster({
			hospitalId,
			documentCode: DOCUMENT_PRINT_CODE.MED_ORDER_RECEIPT,
			document: { documentNumber: r.receiptNo },
			extraPlaceholders: {
				'{{print.body_html}}': bodyHtml,
				'{{print.label_title}}': m.med_order_receipt_print(),
				'{{document.number}}': r.receiptNo,
				'{{print.customer}}': r.batch.extCustomerName ?? '',
				'{{print.doctor}}': r.batch.advisingDoctor ?? ''
			},
			iframeId: 'med-order-receipt-print-iframe'
		});
	}

	async function printReceiptForBatchId(batchId: number) {
		const u = new URL(apiRoot(), window.location.origin);
		u.searchParams.set('mode', 'batch.get');
		u.searchParams.set('batchId', String(batchId));
		const res = await fetch(u, { credentials: 'include' });
		if (!res.ok) {
			toastService.addToast(
				m.med_order_int_load_failed(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const pack = (await res.json()) as {
			batch: {
				id: number;
				storeId: number;
				batchNo: string;
				extCustomerName: string | null;
				advisingDoctor: string | null;
			};
			lines: Record<string, unknown>[];
			payment: {
				receiptNo: string;
				amountDue: string;
				amountPaid: string;
				paymentMethod: string;
				paidAt: string;
			} | null;
		};
		if (!pack.payment) {
			toastService.addToast(
				m.med_order_ext_receipt_unavailable(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const lines = await Promise.all(
			pack.lines.map(async (ln) => {
				const qtyOut = String(ln.qtyOut ?? '1');
				const unitSalePrice = String(ln.unitSalePrice ?? '0');
				return {
					itemName: await fetchItemDisplayName(
						Number(ln.itemMasterId)
					),
					qtyOut,
					unitSalePrice,
					lineTotal: lineTotal(qtyOut, unitSalePrice).toFixed(2)
				};
			})
		);
		await printReceiptFromPack({
			receiptNo: pack.payment.receiptNo,
			amountDue: pack.payment.amountDue,
			amountPaid: pack.payment.amountPaid,
			paymentMethod: pack.payment.paymentMethod,
			paidAt: pack.payment.paidAt,
			batch: {
				id: pack.batch.id,
				batchNo: pack.batch.batchNo,
				extCustomerName: pack.batch.extCustomerName,
				advisingDoctor: pack.batch.advisingDoctor,
				storeId: pack.batch.storeId
			},
			lines
		});
	}

	async function openHistory() {
		await dialogService.open({
			title: '',
			component: MedicationOrderHistoryDialogContent,
			fullScreen: true,
			props: {
				title: m.med_order_ext_history_title(),
				apiRoot: apiRoot(),
				enableColumnFilters: false,
				onEdit: loadBatchForEdit,
				onReorder: reorderBatchById,
				onDelete: deleteBatchById,
				onPrintReceipt: printReceiptForBatchId
			}
		});
	}

	function lineToDraft(
		ln: Record<string, unknown>,
		itemName: string,
		lineAllocations: {
			lineId: number;
			batchId: number;
			qtyPurchase: string;
			batchNo: string | null;
			expiryDate: string | null;
		}[]
	): DraftLine {
		const lineId = Number(ln.id);
		const myAllocs = lineAllocations.filter((a) => a.lineId === lineId);
		const fRow = (masters?.freqs ?? []).find(
			(x) => x.id === Number(ln.frequencyId)
		);
		const batchAllocationsDraft: ConsumptionBatchAllocationDraft[] =
			myAllocs.map((a) => ({
				batchId: a.batchId,
				batchNo: a.batchNo ?? '',
				expiryDate: a.expiryDate,
				stockIssueQty: '0',
				salePrice: null,
				issueUnitName: null,
				qtyPurchase: String(a.qtyPurchase)
			}));
		return {
			_key: `e-${String(ln.id)}`,
			_itemName: itemName,
			_freqLabel: fRow?.label ?? '—',
			itemMasterId: Number(ln.itemMasterId),
			dose: String(ln.dose ?? '1'),
			doseUnitId: Number(ln.doseUnitId),
			frequencyId: Number(ln.frequencyId),
			durationValue: String(ln.durationValue ?? '1'),
			durationUnitId: Number(ln.durationUnitId),
			formId: ln.formId != null ? Number(ln.formId) : null,
			routeId: ln.routeId != null ? Number(ln.routeId) : null,
			orderTypeId:
				ln.orderTypeId != null ? Number(ln.orderTypeId) : null,
			foodRelationId:
				ln.foodRelationId != null ? Number(ln.foodRelationId) : null,
			startAt: String(ln.startAt),
			testDose: ln.testDose != null ? String(ln.testDose) : null,
			substituteNotAllowed: Boolean(ln.substituteNotAllowed),
			unitSalePrice: String(ln.unitSalePrice ?? '0'),
			qtyOut: String(ln.qtyOut ?? '1'),
			outUnitId: Number(ln.outUnitId ?? 0),
			itemUnitMasterId: Number(ln.itemUnitMasterId ?? 0),
			allocations: myAllocs.map((a) => ({
				batchId: a.batchId,
				qtyPurchase: String(a.qtyPurchase)
			})),
			_batchAllocations: batchAllocationsDraft,
			_iumList: []
		};
	}

	async function fetchItemDisplayName(
		itemMasterId: number
	): Promise<string> {
		if (!hospitalId) return `Item #${itemMasterId}`;
		const res = await fetch(
			`/api/medora/hospital/${hospitalId}/home/inventory-setup/item-master?id=${itemMasterId}`,
			{ credentials: 'include' }
		);
		if (!res.ok) return `Item #${itemMasterId}`;
		const d = (await res.json()) as { itemName?: string | null };
		return d.itemName?.trim() || `Item #${itemMasterId}`;
	}

	async function reloadDraftLinesFromSavedBatch(batchId: number) {
		if (!hospitalId) return;
		const u = new URL(apiRoot(), window.location.origin);
		u.searchParams.set('mode', 'batch.get');
		u.searchParams.set('batchId', String(batchId));
		const res = await fetch(u, { credentials: 'include' });
		if (!res.ok) return;
		const pack = (await res.json()) as {
			lines: Record<string, unknown>[];
			allocations: {
				lineId: number;
				batchId: number;
				qtyPurchase: string;
				batchNo: string | null;
				expiryDate: string | null;
			}[];
		};
		draftLines = await Promise.all(
			pack.lines.map(async (ln) =>
				lineToDraft(
					ln,
					await fetchItemDisplayName(Number(ln.itemMasterId)),
					pack.allocations ?? []
				)
			)
		);
	}

	async function loadBatchForEdit(id: number) {
		dialogService.cancel();
		const u = new URL(apiRoot(), window.location.origin);
		u.searchParams.set('mode', 'batch.get');
		u.searchParams.set('batchId', String(id));
		const res = await fetch(u, { credentials: 'include' });
		if (!res.ok) {
			toastService.addToast(
				m.med_order_int_load_failed(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const pack = (await res.json()) as {
			batch: {
				id: number;
				storeId: number;
				batchNo: string;
				extCustomerName: string | null;
				advisingDoctor: string | null;
			};
			lines: Record<string, unknown>[];
			allocations: {
				lineId: number;
				batchId: number;
				qtyPurchase: string;
				batchNo: string | null;
				expiryDate: string | null;
			}[];
			payment: {
				amountPaid: string;
				amountDue: string;
				receiptNo: string;
				paymentMethod: string;
				paidAt: string;
			} | null;
		};
		if (!masters) await loadMasters();
		editingBatchId = id;
		const sid = String(pack.batch.storeId);
		storeIdStr = sid;
		customerName = pack.batch.extCustomerName ?? '';
		advisingDoctor = pack.batch.advisingDoctor ?? '';
		batchIsPaid = pack.payment != null;
		amountPaid = pack.payment?.amountPaid ?? draftTotal;
		storeLabel =
			storeNameById[pack.batch.storeId] ??
			(await resolveStoreLabelForId(sid));
		draftLines = await Promise.all(
			pack.lines.map(async (ln) =>
				lineToDraft(
					ln,
					await fetchItemDisplayName(Number(ln.itemMasterId)),
					pack.allocations ?? []
				)
			)
		);
		await tick();
		resetNewLineForm();
	}

	async function reorderBatchById(
		sourceBatchId: number
	): Promise<boolean> {
		try {
			const res = await fetch(apiRoot(), {
				method: 'POST',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'batch.reorder',
					sourceBatchId
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			void (await res.json());
			toastService.addToast(
				m.med_order_int_reorder_line_appended(),
				StatusColorEnum.SUCCESS
			);
			return true;
		} catch (e) {
			toastService.addErrorToast(m.med_order_int_save_failed(), e);
			return false;
		}
	}

	async function deleteBatchById(id: number): Promise<boolean> {
		try {
			const res = await fetch(apiRoot(), {
				method: 'POST',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'batch.delete',
					batchId: id
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastService.addToast(
				m.med_order_int_deleted(),
				StatusColorEnum.SUCCESS
			);
			if (editingBatchId === id) {
				resetEditing();
			}
			return true;
		} catch (e) {
			toastService.addErrorToast(m.med_order_int_delete_failed(), e);
			return false;
		}
	}

	async function deleteCurrentBatch() {
		if (!editingBatchId) return;
		const c = await dialogService.open({
			title: m.med_order_int_delete_title(),
			message: m.med_order_int_delete_confirm(),
			variant: DialogVariantEnum.CONFIRM
		});
		if (!c.confirmed) return;
		isBusy = true;
		try {
			const res = await fetch(apiRoot(), {
				method: 'POST',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'batch.delete',
					batchId: editingBatchId
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastService.addToast(
				m.med_order_int_deleted(),
				StatusColorEnum.SUCCESS
			);
			resetEditing();
		} catch (e) {
			toastService.addErrorToast(m.med_order_int_delete_failed(), e);
		} finally {
			isBusy = false;
		}
	}
</script>

<div class="flex min-h-0 min-w-0 flex-col gap-3">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-lg font-bold text-primary">
			{m.medication_order_external_sales_title()}
		</h1>
		<div class="flex flex-wrap items-center gap-2">
			{#if editingBatchId}
				<span class="text-sm text-warning">{m.med_order_int_editing()}</span>
				<WashButton className="btn-ghost btn-sm cursor-pointer" onClick={resetEditing}>
					{m.med_order_int_cancel_edit()}
				</WashButton>
				{#if !batchIsPaid}
					<WashButton
						className="btn-error btn-ghost btn-sm cursor-pointer"
						onClick={deleteCurrentBatch}
						disabled={isBusy}
					>
						<LucideTrash2 className="size-4" />
						{m.delete_data()}
					</WashButton>
				{/if}
			{/if}
			<WashButton className="btn btn-ghost btn-sm cursor-pointer" onClick={openHistory}>
				<LucideListOrdered className="size-4" />
				{m.med_order_ext_history_title()}
			</WashButton>
		</div>
	</div>

	<div
		class="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:gap-5"
	>
		<!-- LEFT: composer + cart -->
		<div class="flex min-w-0 flex-col gap-4">
			<section
				class="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm"
				aria-label={m.med_order_ext_add_item_title()}
			>
				<h2 class="mb-3 text-base font-bold text-primary">
					{m.med_order_ext_add_item_title()}
				</h2>
				<div class="flex flex-col gap-3">
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div class="flex min-w-0 flex-col gap-1.5">
							<label class="shrink-0 text-sm font-medium" for="ext-sales-store">{m.med_order_int_store()}</label>
							<SearchSelect
								bind:value={storeIdStr}
								searchFn={searchStoresForSelect}
								getLabelForValue={getStoreLabelForValue}
								placeholder={m.med_order_int_store_search()}
								minSearchLength={0}
								debounceMs={300}
								onChange={onStoreSearchChange}
								inputId="ext-sales-store"
								className="w-full"
								disabled={batchIsPaid}
							/>
						</div>
						<div class="flex min-w-0 flex-col gap-1.5">
							<label class="shrink-0 text-sm font-medium" for="a11y-medicationorderexternals-e79522">{m.med_order_int_pharmacy_generic()}</label>
							<SearchSelect
								bind:value={pharmacyGenericId}
								options={genericOptions}
								placeholder={m.med_order_int_all_generics()}
								className="w-full"
								disabled={batchIsPaid} inputId="a11y-medicationorderexternals-e79522" />
						</div>
					</div>
					<div class="flex min-w-0 flex-col gap-1.5">
						<label class="shrink-0 text-sm font-medium" for="ext-sales-item">{m.med_order_int_item()}</label>
						<SearchSelect
							bind:value={itemValueStr}
							searchFn={searchItemsFromMaster}
							getLabelForValue={getItemLabelForValue}
							placeholder={m.med_order_int_item_search()}
							minSearchLength={0}
							debounceMs={300}
							invalidateKey={itemFilterKey}
							disabled={storeId <= 0 || batchIsPaid}
							onChange={onItemSearchChange}
							inputId="ext-sales-item"
							className="w-full"
						/>
					</div>
					{#if selectedItem && storeId > 0}
						<MedicationOrderInventoryFields
							{hospitalId}
							storeId={storeId}
							itemId={selectedItem.id}
							itemLabel={selectedItem.itemName ?? ''}
							pricingModule={EXTERNAL_SALES_PRICING_MODULE}
							outUnitMode="selectable"
							bind:batchAllocations
							bind:iumList
							bind:itemUnitMasterIdStr
							bind:qtyOut
							bind:outUnitIdStr
							bind:unitSalePrice
							disabled={batchIsPaid}
						/>
					{/if}

					<details
						class="rounded-lg border border-base-300 bg-base-200/40"
						bind:open={showRxDetails}
					>
						<summary
							class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden"
						>
							<LucideChevronRight
								className="size-4 shrink-0 transition-transform {showRxDetails
									? 'rotate-90'
									: ''}"
							/>
							{m.med_order_ext_rx_details()}
						</summary>
						<div class="grid grid-cols-1 gap-3 border-t border-base-300 p-3 sm:grid-cols-2 lg:grid-cols-3">
							<div class="flex min-w-0 flex-col gap-1.5">
								<label class="text-sm font-medium" for="a11y-medicationorderexternals-f8d9f8">{m.med_order_int_dose()}</label>
								<WashInputField
									nameText="ext-dose"
									bind:value={dose}
									inputType="text"
									className="w-full"
									minLength={0}
									disabled={batchIsPaid} id="a11y-medicationorderexternals-f8d9f8" />
							</div>
							<div class="flex min-w-0 flex-col gap-1.5">
								<label class="text-sm font-medium" for="a11y-medicationorderexternals-aaa5ab">{m.med_order_int_dose_unit()}</label>
								<SearchSelect
									bind:value={doseUnitIdStr}
									options={doseUnitOptions}
									placeholder="—"
									disabled={!masters || batchIsPaid}
									className="w-full" inputId="a11y-medicationorderexternals-aaa5ab" />
							</div>
							<div class="flex min-w-0 flex-col gap-1.5">
								<label class="text-sm font-medium" for="a11y-medicationorderexternals-55f8c6">{m.med_order_int_frequency()}</label>
								<SearchSelect
									bind:value={frequencyIdStr}
									options={frequencyOptions}
									placeholder={m.med_order_int_frequency_filter()}
									disabled={!masters || batchIsPaid}
									className="w-full" inputId="a11y-medicationorderexternals-55f8c6" />
							</div>
							<div class="flex min-w-0 flex-col gap-1.5">
								<label class="text-sm font-medium" for="a11y-medicationorderexternals-f42413">{m.med_order_int_duration()}</label>
								<div class="flex min-w-0 flex-col gap-2 sm:flex-row">
									<WashInputField
										nameText="ext-dv"
										bind:value={durationValue}
										inputType="text"
										className="w-full max-w-24 shrink-0"
										minLength={0}
										disabled={batchIsPaid} id="a11y-medicationorderexternals-f42413" />
									<div class="min-w-0 flex-1">
										<SearchSelect
											bind:value={durationUnitIdStr}
											options={durationUnitOptions}
											placeholder="—"
											disabled={!masters || batchIsPaid}
											className="w-full"
										/>
									</div>
								</div>
							</div>
							<div class="flex min-w-0 flex-col gap-1.5">
								<label class="text-sm font-medium" for="a11y-medicationorderexternals-a738ad">{m.med_order_int_form()}</label>
								<SearchSelect
									bind:value={formId}
									options={formOptions}
									placeholder={m.med_order_int_not_applicable()}
									disabled={!masters || batchIsPaid}
									className="w-full" inputId="a11y-medicationorderexternals-a738ad" />
							</div>
							<div class="flex min-w-0 flex-col gap-1.5">
								<label class="text-sm font-medium" for="a11y-medicationorderexternals-fe0dda">{m.med_order_int_route()}</label>
								<SearchSelect
									bind:value={routeId}
									options={routeOptions}
									placeholder={m.med_order_int_not_applicable()}
									disabled={!masters || batchIsPaid}
									className="w-full" inputId="a11y-medicationorderexternals-fe0dda" />
							</div>
							<div class="flex min-w-0 flex-col gap-1.5">
								<label class="text-sm font-medium" for="a11y-medicationorderexternals-51b6fb">{m.med_order_int_order_type()}</label>
								<SearchSelect
									bind:value={orderTypeId}
									options={orderTypeOptions}
									placeholder={m.med_order_int_not_applicable()}
									disabled={!masters || batchIsPaid}
									className="w-full" inputId="a11y-medicationorderexternals-51b6fb" />
							</div>
							<div class="flex min-w-0 flex-col gap-1.5">
								<label class="text-sm font-medium" for="a11y-medicationorderexternals-79500e">{m.med_order_int_food_relation()}</label>
								<SearchSelect
									bind:value={foodRelationId}
									options={foodRelOptions}
									placeholder={m.med_order_int_not_applicable()}
									disabled={!masters || batchIsPaid}
									className="w-full" inputId="a11y-medicationorderexternals-79500e" />
							</div>
							<div class="flex min-w-0 flex-col gap-1.5">
								<span class="text-sm font-medium">{m.med_order_int_start()}</span>
								<WashInputField
									inputType="datetime-local"
									className="w-full min-w-0"
									bind:value={startAtLocal}
									min={minStart}
									disabled={batchIsPaid}
								/>
							</div>
							<div class="flex min-w-0 flex-col gap-1.5">
								<span class="text-sm font-medium">{m.med_order_int_test_dose()}</span>
								<WashInputField
									nameText="ext-td"
									bind:value={testDose}
									className="w-full"
									minLength={0}
									disabled={batchIsPaid}
								/>
							</div>
							<div class="flex min-w-0 flex-col items-start gap-2 sm:col-span-2">
								<span class="text-sm font-medium">{m.med_order_int_substitue()}</span>
								<div class="flex flex-wrap gap-3">
									<label class="flex cursor-pointer items-center gap-2 text-sm">
										<input
											type="radio"
											class="radio radio-sm"
											checked={!substituteNotAllowed}
											disabled={batchIsPaid}
											onchange={() => (substituteNotAllowed = false)}
										/>
										{m.med_order_int_substitue_no()}
									</label>
									<label class="flex cursor-pointer items-center gap-2 text-sm">
										<input
											type="radio"
											class="radio radio-sm"
											checked={substituteNotAllowed}
											disabled={batchIsPaid}
											onchange={() => (substituteNotAllowed = true)}
										/>
										{m.med_order_int_substitue_yes()}
									</label>
								</div>
							</div>
						</div>
					</details>

					<div class="flex flex-wrap gap-2 pt-1">
						<WashButton
							className="btn btn-primary cursor-pointer"
							onClick={addDraft}
							disabled={batchIsPaid || !storeId || !partyReady}
						>
							{editingLineKey
								? m.med_order_ext_update_line()
								: m.med_order_ext_add_to_cart()}
						</WashButton>
						{#if editingLineKey}
							<WashButton
								className="btn btn-ghost cursor-pointer"
								onClick={resetNewLineForm}
								disabled={batchIsPaid}
							>
								{m.cancel()}
							</WashButton>
						{/if}
					</div>
				</div>
			</section>

			<section class="flex min-h-[16rem] min-w-0 flex-col" aria-label={m.med_order_ext_cart_title()}>
				<MenziesTable
					title={m.med_order_ext_cart_title()}
					rows={draftLines}
					columns={draftColumns}
					bind:currentPage={draftCurrentPage}
					bind:pageSize={draftPageSizeStr}
					showRefreshButton={false}
					emptyMessage={m.medication_order_external_sales_empty()}
					showRowActions={true}
					actionsHeader={m.actions()}
					actionsVariant="none"
					enableColumnFilters={true}
					totalRowCount={draftLines.length}
					fillParent={true}
					bind:columnFilters={draftColumnFilters}
					showAddButton={false}
				>
					{#snippet rowActions(row, localIdx)}
						{@const draft = row as DraftLine}
						<MenziesTableRowActionGroup>
							<MenziesTableIconAction
								tooltipText={m.med_order_int_tooltip_edit()}
								color="accent"
								disabled={batchIsPaid}
								onClick={() => hydrateFormFromLine(draft)}
							>
								{#snippet icon()}
									<LucidePencil className="size-4" />
								{/snippet}
							</MenziesTableIconAction>
							<MenziesTableIconAction
								tooltipText={m.med_order_int_tooltip_move_up()}
								color="info"
								disabled={globalDraftIndex(localIdx) <= 0 || batchIsPaid}
								onClick={() => moveDraftLine(globalDraftIndex(localIdx), -1)}
							>
								{#snippet icon()}
									<LucideChevronRight className="size-4 -rotate-90" />
								{/snippet}
							</MenziesTableIconAction>
							<MenziesTableIconAction
								tooltipText={m.med_order_int_tooltip_move_down()}
								color="info"
								disabled={globalDraftIndex(localIdx) >= draftLines.length - 1 ||
									batchIsPaid}
								onClick={() => moveDraftLine(globalDraftIndex(localIdx), 1)}
							>
								{#snippet icon()}
									<LucideChevronRight className="size-4 rotate-90" />
								{/snippet}
							</MenziesTableIconAction>
							<MenziesTableIconAction
								tooltipText={m.med_order_int_tooltip_delete()}
								color="error"
								disabled={batchIsPaid}
								onClick={() => removeDraft(draft._key)}
							>
								{#snippet icon()}
									<LucideTrash2 className="size-4" />
								{/snippet}
							</MenziesTableIconAction>
						</MenziesTableRowActionGroup>
					{/snippet}
				</MenziesTable>
			</section>
		</div>

		<!-- RIGHT: sticky party + totals + pay -->
		<aside
			class="sticky top-2 flex min-w-0 flex-col gap-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-md lg:self-start"
		>
			<section class="flex flex-col gap-3" aria-label={m.med_order_ext_party_title()}>
				<h2 class="text-base font-bold text-primary">{m.med_order_ext_party_title()}</h2>
				<div class="flex min-w-0 flex-col gap-1.5">
					<label class="text-sm font-medium" for="ext-cust">
						{m.med_order_ext_customer_name()}<span
							class="align-top text-sm leading-none text-error"
							aria-hidden="true">*</span
						>
					</label>
					<WashInputField
						nameText="ext-cust"
						bind:value={customerName}
						inputPlaceholderText={m.med_order_ext_customer_placeholder()}
						className="w-full"
						minLength={0}
						disabled={editingBatchId > 0 || batchIsPaid}
					/>
				</div>
				<div class="flex min-w-0 flex-col gap-1.5">
					<label class="text-sm font-medium" for="ext-doc"
						>{m.med_order_ext_advising_doctor()}</label
					>
					<WashInputField
						nameText="ext-doc"
						bind:value={advisingDoctor}
						inputPlaceholderText={m.med_order_ext_advising_doctor_placeholder()}
						className="w-full"
						minLength={0}
						disabled={editingBatchId > 0 || batchIsPaid}
					/>
				</div>
			</section>

			<section class="flex flex-col gap-3 border-t border-base-300 pt-3">
				<h2 class="text-base font-bold text-primary">{m.med_order_ext_order_summary()}</h2>
				<div class="flex items-center justify-between text-sm">
					<span class="text-base-content/70">{m.med_order_ext_line_count()}</span>
					<strong>{draftLines.length}</strong>
				</div>
				<div class="flex items-center justify-between text-base">
					<span class="font-medium">{m.med_order_amount_due()}</span>
					<strong class="text-lg tabular-nums">{draftTotal}</strong>
				</div>
				<WashButton
					className="btn btn-secondary w-full cursor-pointer"
					onClick={persistBatch}
					disabled={batchIsPaid ||
						!storeId ||
						draftLines.length === 0 ||
						isBusy ||
						!partyReady}
					loading={isBusy}
				>
					<LucideCircleCheck className="size-4" />
					{editingBatchId
						? m.med_order_int_update_order()
						: m.med_order_int_save_order()}
				</WashButton>
			</section>

			{#if editingBatchId && draftLines.length > 0}
				<section class="flex flex-col gap-3 border-t border-base-300 pt-3">
					<h2 class="text-base font-bold text-primary">{m.med_order_checkout_title()}</h2>
					{#if batchIsPaid}
						<p class="text-sm text-success">{m.med_order_paid_locked()}</p>
						<WashButton
							className="btn btn-primary w-full cursor-pointer"
							onClick={() => void printReceiptForBatchId(editingBatchId)}
						>
							{m.med_order_receipt_print()}
						</WashButton>
					{:else}
						<div class="flex flex-col gap-1">
							<label class="text-sm font-medium" for="mo-ext-payment-method">{m.med_order_payment_method()}</label>
							<WashSelect
								id="mo-ext-payment-method"
								className="w-full"
								bind:value={paymentMethod}
								options={[
									{ value: 'cash', label: m.med_order_payment_cash() },
									{ value: 'card', label: m.med_order_payment_card() }
								]}
							/>
						</div>
						<div class="flex flex-col gap-1">
							<label class="text-sm font-medium" for="a11y-medicationorderexternals-1f59d3">{m.med_order_amount_paid()}</label>
							<WashInputField
								nameText="amountPaid"
								bind:value={amountPaid}
								inputType="text"
								className="w-full"
								minLength={0} id="a11y-medicationorderexternals-1f59d3" />
						</div>
						<WashButton
							className="btn btn-primary btn-lg w-full cursor-pointer"
							onClick={checkoutBatch}
							disabled={isBusy}
							loading={isBusy}
						>
							{m.med_order_pay_now()}
						</WashButton>
					{/if}
				</section>
			{/if}
		</aside>
	</div>
</div>
