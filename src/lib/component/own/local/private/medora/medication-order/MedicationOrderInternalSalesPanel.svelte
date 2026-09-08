<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import LucideListOrdered from '$lib/component/own/library/lucide/LucideListOrdered.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import MariTableIconAction from '$lib/component/own/library/mari/table/MariTableIconAction.svelte';
	import MariTableRowActionGroup from '$lib/component/own/library/mari/table/MariTableRowActionGroup.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { m } from '$lib/paraglide/messages';
	import type {
		ItemNamePriceRow,
		MedicationOrderMastersResponse,
		MedicationOrderLineInput
	} from '$lib/model/type/medora/medication-order.type';
	import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/medora/department-consumption-detail.type';
	import type { ConsumptionDraftLineIum } from '$lib/model/type/medora/department-consumption-detail.type';
	import { INTERNAL_SALES_PRICING_MODULE } from '$lib/model/type/medora/inv-pricing-module.type';
	import MedicationOrderInventoryFields from '$lib/component/own/local/private/medora/medication-order/MedicationOrderInventoryFields.svelte';
	import MedicationOrderVisitPrescriptionNotesCard from '$lib/component/own/local/private/medora/medication-order/MedicationOrderVisitPrescriptionNotesCard.svelte';
	import MedicationOrderHistoryDialogContent from '$lib/component/own/local/private/medora/medication-order/MedicationOrderHistoryDialogContent.svelte';
	import {
		hydrateMedOrderItemMeta,
		loadMedOrderIumList,
		refreshMedOrderBatchAllocations,
		syncMedOrderFefoAllocations,
		validateMedOrderInventoryLine,
		applyDraftReservationsToLots
	} from '$lib/tool/medication-order/med-order-line-inventory.util';
	import {
		isMedOrderStartBeforeToday,
		medOrderMinStartDateTimeLocal
	} from '$lib/tool/medication-order/med-order-start-date.util';
	import {
		medOrderOutUnitName,
		resolveMedOrderIumForOutUnit
	} from '$lib/tool/inventory/med-order-out-qty.util';
	import { formatMedOrderPrescriptionDetail } from '$lib/tool/medication-order/format-med-order-prescription-detail.util';
	import { formatMedOrderItemSearchLabel } from '$lib/tool/medication-order/format-med-order-item-search-label.util';
	import { untrack, tick } from 'svelte';
	import { applyStaggeredStartDates } from '$lib/util/med-order-stagger.util';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	const visitIdNum = $derived(
		VisitState.visitId ? Number(VisitState.visitId) : 0
	);

	function apiRoot() {
		return `/api/medora/hospital/${hospitalId}/home/medication-order/internal-sales`;
	}

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

	const minStart = $derived.by(() => medOrderMinStartDateTimeLocal());

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

	let isBusy = $state(false);
	let editingBatchId = $state(0);

	type DraftLine = MedicationOrderLineInput & {
		_key: string;
		_itemName: string;
		_freqLabel: string;
		_batchAllocations: ConsumptionBatchAllocationDraft[];
		_iumList: ConsumptionDraftLineIum[];
	};

	let draftLines = $state<DraftLine[]>([]);

	/** Store labels for edit / display (history dialog loads its own copy). */
	let storeNameById = $state<Record<number, string>>({});

	let draftCurrentPage = $state(1);
	let draftPageSizeStr = $state('25');
	let draftColumnFilters = $state<Record<string, string>>({});

	let prevItemFilterKey = $state<string | null>(null);

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


	const draftColumns = $derived.by(
		(): MariTableColumn<DraftLine>[] => {
			const ps = Number(draftPageSizeStr) || 25;
			const medMasters = masters;
			const store = storeLabel.trim() || (storeId > 0 ? `#${storeId}` : '—');
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
					id: 'prescription',
					header: m.med_order_int_prescription_detail(),
					widthClass: 'min-w-[18rem]',
					filterable: true,
					format: (_v, row) =>
						formatMedOrderPrescriptionDetail(
							{
								dose: row.dose,
								doseUnitId: row.doseUnitId,
								frequencyId: row.frequencyId,
								durationValue: row.durationValue,
								durationUnitId: row.durationUnitId,
								routeId: row.routeId,
								orderTypeId: row.orderTypeId,
								foodRelationId: row.foodRelationId,
								startAt: row.startAt,
								testDose: row.testDose
							},
							medMasters
						)
				},
				{
					id: 'qtyOut',
					header: m.med_order_int_total_qty(),
					widthClass: 'w-24',
					filterable: true,
					format: (_v, row) => row.qtyOut?.trim() || '—'
				},
				{
					id: 'qtyUnit',
					header: m.med_order_int_qty_unit(),
					widthClass: 'min-w-[6rem]',
					filterable: true,
					format: (_v, row) =>
						medOrderOutUnitName(
							row._iumList,
							row.outUnitId,
							row.itemUnitMasterId
						) || '—'
				},
				{
					id: 'store',
					header: m.med_order_int_store(),
					widthClass: 'min-w-[8rem]',
					filterable: true,
					format: () => store
				}
			];
		}
	);

	/** Clear stale item when store or generic filter changes (not on first run). */
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
		if (VisitState.visitId && hospitalId) {
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

	function resetLineInventoryFields() {
		qtyOut = '';
		outUnitIdStr = '';
		itemUnitMasterIdStr = '';
		unitSalePrice = '0';
		batchAllocations = [];
		iumList = [];
	}

	function resetNewLineForm() {
		itemValueStr = '';
		selectedItem = null;
		dose = '1';
		durationValue = '1';
		formId = '';
		routeId = '';
		orderTypeId = '';
		foodRelationId = '';
		testDose = '';
		substituteNotAllowed = false;
		if (masters?.durUnits[0]) {
			durationUnitIdStr = String(masters.durUnits[0].id);
		}
		if (masters?.doseUnits[0]) {
			doseUnitIdStr = String(masters.doseUnits[0].id);
		}
		if (masters?.freqs[0]) {
			frequencyIdStr = String(masters.freqs[0].id);
		}
		startAtLocal = toDateTimeLocalValue(new Date());
		resetLineInventoryFields();
	}

	function resetEditing() {
		editingBatchId = 0;
		draftLines = [];
		resetNewLineForm();
	}

	function addDraft() {
		if (!visitIdNum) {
			toastService.addToast(
				m.med_order_int_no_visit(),
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
		const doseUnitId = Number(doseUnitIdStr);
		const frequencyId = Number(frequencyIdStr);
		const durationUnitId = Number(durationUnitIdStr);
		if (
			!doseUnitIdStr ||
			!frequencyIdStr ||
			!durationUnitIdStr ||
			!Number.isFinite(doseUnitId) ||
			doseUnitId <= 0 ||
			!Number.isFinite(frequencyId) ||
			frequencyId <= 0 ||
			!Number.isFinite(durationUnitId) ||
			durationUnitId <= 0
		) {
			toastService.addToast(
				m.med_order_int_missing_master(),
				StatusColorEnum.ERROR
			);
			return;
		}
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

		draftLines = [
			...draftLines,
			{
				...line,
				_key: `d-${Date.now()}-${Math.random()}`,
				_itemName:
					selectedItem.itemName ?? `Item #${selectedItem.id}`,
				_freqLabel: fRow?.label ?? '—',
				_batchAllocations: syncedLots.map((a) => ({ ...a })),
				_iumList: [...iumList]
			}
		];
		resetNewLineForm();
	}

	function staggerDraftLinesFromOrder(): void {
		const du = masters?.durUnits ?? [];
		if (du.length === 0 || draftLines.length <= 1) return;
		draftLines = applyStaggeredStartDates(
			draftLines,
			du
		) as DraftLine[];
		if (draftLines[0]) {
			hydrateFormFromLine(draftLines[0]);
		}
	}

	function removeDraft(k: string) {
		const next = draftLines.filter((d) => d._key !== k);
		draftLines = next;
		if (next.length >= 2) {
			staggerDraftLinesFromOrder();
		} else if (next[0]) {
			hydrateFormFromLine(next[0]);
		}
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
		staggerDraftLinesFromOrder();
	}

	function hydrateFormFromLine(line: DraftLine) {
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
		durationValue = String(line.durationValue);
		durationUnitIdStr = String(line.durationUnitId);
		formId = line.formId != null ? String(line.formId) : '';
		routeId = line.routeId != null ? String(line.routeId) : '';
		orderTypeId =
			line.orderTypeId != null ? String(line.orderTypeId) : '';
		foodRelationId =
			line.foodRelationId != null ? String(line.foodRelationId) : '';
		startAtLocal = toDateTimeLocalValue(new Date(line.startAt));
		testDose = line.testDose ?? '';
		substituteNotAllowed = line.substituteNotAllowed;
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
						batchAllocations =
							await refreshMedOrderBatchAllocations(
								hospitalId,
								storeId,
								line.itemMasterId
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

	async function persistBatch() {
		if (!visitIdNum) {
			toastService.addToast(
				m.med_order_int_no_visit(),
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
		const lines = draftLines.map(
			({
				_key,
				_itemName,
				_freqLabel,
				_batchAllocations,
				_iumList,
				...rest
			}) => rest
		);
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
				if (!res.ok) throw new Error(await res.text());
				toastService.addToast(
					m.med_order_int_updated(),
					StatusColorEnum.SUCCESS
				);
			} else {
				const res = await fetch(apiRoot(), {
					method: 'POST',
					credentials: 'include',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						mode: 'batch.save',
						visitId: visitIdNum,
						storeId,
						lines
					})
				});
				if (!res.ok) throw new Error(await res.text());
				void (await res.json());
				toastService.addToast(
					m.med_order_int_saved(),
					StatusColorEnum.SUCCESS
				);
			}
			resetEditing();
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

	async function openHistory() {
		if (!visitIdNum) {
			toastService.addToast(
				m.med_order_int_no_visit(),
				StatusColorEnum.ERROR
			);
			return;
		}
		await dialogService.open({
			title: m.med_order_int_history(),
			component: MedicationOrderHistoryDialogContent,
			fullScreen: true,
			props: {
				apiRoot: apiRoot(),
				visitId: visitIdNum,
				enableColumnFilters: true,
				onEdit: loadBatchForEdit,
				onReorder: reorderBatchById,
				onDelete: deleteBatchById
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

	async function enrichInternalDraftLine(draft: DraftLine): Promise<DraftLine> {
		if (!hospitalId || !draft.itemUnitMasterId) return draft;
		try {
			const meta = await hydrateMedOrderItemMeta(
				hospitalId,
				draft.itemMasterId
			);
			const ium = await loadMedOrderIumList(
				hospitalId,
				meta.itemUnitMasterIds,
				draft.itemUnitMasterId
			);
			return {
				...draft,
				_iumList: ium.iumList
			};
		} catch {
			return draft;
		}
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
			};
			lines: Record<string, unknown>[];
			allocations: {
				lineId: number;
				batchId: number;
				qtyPurchase: string;
				batchNo: string | null;
				expiryDate: string | null;
			}[];
		};
		if (!masters) await loadMasters();
		editingBatchId = id;
		storeIdStr = String(pack.batch.storeId);
		storeLabel =
			storeNameById[pack.batch.storeId] ?? `#${pack.batch.storeId}`;
		draftLines = await Promise.all(
			(
				await Promise.all(
					pack.lines.map(async (ln) =>
						lineToDraft(
							ln,
							await fetchItemDisplayName(Number(ln.itemMasterId)),
							pack.allocations ?? []
						)
					)
				)
			).map((draft) => enrichInternalDraftLine(draft))
		);
		await tick();
		if (draftLines[0]) {
			hydrateFormFromLine(draftLines[0]);
		}
	}

	/** New batch + new batch number: copy this batch’s first line; start is after the latest line end for the visit. */
	async function reorderBatchById(
		sourceBatchId: number
	): Promise<boolean> {
		if (!visitIdNum) {
			toastService.addToast(
				m.med_order_int_no_visit(),
				StatusColorEnum.ERROR
			);
			return false;
		}
		try {
			const res = await fetch(apiRoot(), {
				method: 'POST',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'batch.reorder',
					visitId: visitIdNum,
					sourceBatchId
				})
			});
			if (!res.ok) throw new Error(await res.text());
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
			if (!res.ok) throw new Error(await res.text());
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
			if (!res.ok) throw new Error(await res.text());
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

<div
	class="mb-3 flex flex-wrap items-center gap-2 {visitIdNum
		? 'justify-end'
		: 'justify-between'}"
>
	{#if !visitIdNum}
		<h1 class="text-lg font-semibold">
			{m.medication_order_internal_sales_title()}
		</h1>
	{/if}
	<div class="flex flex-wrap items-center gap-2">
		{#if editingBatchId}
			<span class="text-sm text-warning"
				>{m.med_order_int_editing()}</span
			>
			<WashButton
				className="btn-ghost btn-sm"
				onClick={resetEditing}
			>
				{m.med_order_int_cancel_edit()}
			</WashButton>
			<WashButton
				className="btn-error btn-ghost btn-sm"
				onClick={deleteCurrentBatch}
				disabled={isBusy}
			>
				<LucideTrash2 className="size-4" />
				{m.delete_data()}
			</WashButton>
		{/if}
		<WashButton
			className="btn btn-ghost btn-sm"
			onClick={openHistory}
			disabled={!visitIdNum}
		>
			<LucideListOrdered className="size-4" />
			{m.med_order_int_history()}
		</WashButton>
	</div>
</div>

{#if !visitIdNum}
	<WashCard>
		<WashCardBody>
			<p class="text-sm text-base-content/70">
				{m.no_visit_selected()}
			</p>
		</WashCardBody>
	</WashCard>
{:else}
	<div class="flex min-w-0 flex-col gap-5 overflow-x-hidden">
		<div
			class="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,30%)_minmax(0,70%)] lg:gap-5"
		>
			<div class="flex min-h-0 min-w-0">
				<MedicationOrderVisitPrescriptionNotesCard
					{hospitalId}
					visitId={visitIdNum}
					apiRoot={apiRoot()}
				/>
			</div>
			<div class="flex min-h-0 min-w-0">
				<WashCard className="flex h-full w-full flex-col">
					<WashCardBody className="flex h-full min-h-0 flex-col p-4 sm:p-6">
						<WashCardBodyTitle className="shrink-0 text-lg">
							{m.medication_order_internal_sales_title()}
						</WashCardBodyTitle>
						<div
							class="flex w-full min-w-0 flex-col gap-5 sm:gap-6"
						>
				<div
					class="grid min-w-0 grid-cols-1 gap-6 border-b border-base-200 pb-5 lg:grid-cols-3 lg:items-start"
				>
					<div class="flex min-w-0 flex-col items-stretch gap-4">
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<label class="shrink-0">{m.med_order_int_store()}</label>
							<WashSearchSelect
								bind:value={storeIdStr}
								searchFn={searchStoresForSelect}
								getLabelForValue={getStoreLabelForValue}
								placeholder={m.med_order_int_store_search()}
								minSearchLength={0}
								debounceMs={300}
								onChange={onStoreSearchChange}
								inputId="int-sales-store"
								className="w-full"
							/>
						</div>
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<label class="shrink-0">{m.med_order_int_pharmacy_generic()}</label>
							<WashSearchSelect
								bind:value={pharmacyGenericId}
								options={genericOptions}
								placeholder={m.med_order_int_all_generics()}
								className="w-full"
							/>
						</div>
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<label class="shrink-0">{m.med_order_int_item()}</label>
							<WashSearchSelect
								bind:value={itemValueStr}
								searchFn={searchItemsFromMaster}
								getLabelForValue={getItemLabelForValue}
								placeholder={m.med_order_int_item_search()}
								minSearchLength={0}
								debounceMs={300}
								invalidateKey={itemFilterKey}
								disabled={storeId <= 0}
								onChange={onItemSearchChange}
								inputId="int-sales-item"
								className="w-full"
							/>
						</div>
					</div>

					<div class="flex min-w-0 flex-col items-stretch gap-4">
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<label class="shrink-0">{m.med_order_int_dose()}</label>
							<WashInputField
								nameText="dose"
								bind:value={dose}
								inputType="text"
								className="w-full"
								minLength={0}
							/>
						</div>
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<label class="shrink-0">{m.med_order_int_dose_unit()}</label>
							<WashSearchSelect
								bind:value={doseUnitIdStr}
								options={doseUnitOptions}
								placeholder="—"
								disabled={!masters}
								className="w-full"
							/>
						</div>
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<label class="shrink-0">{m.med_order_int_frequency()}</label>
							<WashSearchSelect
								bind:value={frequencyIdStr}
								options={frequencyOptions}
								placeholder={m.med_order_int_frequency_filter()}
								disabled={!masters}
								className="w-full"
							/>
						</div>
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<label class="shrink-0">{m.med_order_int_duration()}</label>
							<div
								class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start"
							>
								<WashInputField
									nameText="dv"
									bind:value={durationValue}
									inputType="text"
									className="w-full max-w-24 shrink-0"
									minLength={0}
								/>
								<div class="min-w-0 flex-1">
									<WashSearchSelect
										bind:value={durationUnitIdStr}
										options={durationUnitOptions}
										placeholder="—"
										disabled={!masters}
										className="w-full"
									/>
								</div>
							</div>
						</div>
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<label class="shrink-0">{m.med_order_int_form()}</label>
							<WashSearchSelect
								bind:value={formId}
								options={formOptions}
								placeholder={m.med_order_int_not_applicable()}
								disabled={!masters}
								className="w-full"
							/>
						</div>
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<label class="shrink-0">{m.med_order_int_route()}</label>
							<WashSearchSelect
								bind:value={routeId}
								options={routeOptions}
								placeholder={m.med_order_int_not_applicable()}
								disabled={!masters}
								className="w-full"
							/>
						</div>
					</div>

					<div class="flex min-w-0 flex-col items-stretch gap-4">
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<label class="shrink-0">{m.med_order_int_order_type()}</label>
							<WashSearchSelect
								bind:value={orderTypeId}
								options={orderTypeOptions}
								placeholder={m.med_order_int_not_applicable()}
								disabled={!masters}
								className="w-full"
							/>
						</div>
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<label class="shrink-0">{m.med_order_int_food_relation()}</label>
							<WashSearchSelect
								bind:value={foodRelationId}
								options={foodRelOptions}
								placeholder={m.med_order_int_not_applicable()}
								disabled={!masters}
								className="w-full"
							/>
						</div>
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<span class="text-sm font-medium"
								>{m.med_order_int_start()}</span
							>
							<input
								type="datetime-local"
								class="input-bordered input w-full min-w-0"
								bind:value={startAtLocal}
								min={minStart}
							/>
						</div>
						<div class="flex w-full min-w-0 flex-col gap-1.5">
							<span class="text-sm font-medium"
								>{m.med_order_int_test_dose()}</span
							>
							<WashInputField
								nameText="td"
								bind:value={testDose}
								className="w-full"
								minLength={0}
							/>
						</div>
						<div
							class="flex w-full min-w-0 flex-col items-start gap-2"
						>
							<span class="text-sm font-medium"
								>{m.med_order_int_substitue()}</span
							>
							<div
								class="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap"
							>
								<label
									class="flex cursor-pointer items-center gap-2 text-sm"
								>
									<input
										type="radio"
										checked={!substituteNotAllowed}
										class="radio radio-sm"
										onchange={() => (substituteNotAllowed = false)}
									/>
									{m.med_order_int_substitue_no()}
								</label>
								<label
									class="flex cursor-pointer items-center gap-2 text-sm"
								>
									<input
										type="radio"
										checked={substituteNotAllowed}
										class="radio radio-sm"
										onchange={() => (substituteNotAllowed = true)}
									/>
									{m.med_order_int_substitue_yes()}
								</label>
							</div>
						</div>
					</div>
				</div>

				{#if selectedItem && storeId > 0}
					<div class="min-w-0">
						<MedicationOrderInventoryFields
							{hospitalId}
							storeId={storeId}
							itemId={selectedItem.id}
							itemLabel={selectedItem.itemName ?? ''}
							pricingModule={INTERNAL_SALES_PRICING_MODULE}
							outUnitMode="selectable"
							bind:batchAllocations
							bind:iumList
							bind:itemUnitMasterIdStr
							bind:qtyOut
							bind:outUnitIdStr
							bind:unitSalePrice
						/>
					</div>
				{/if}

				<div
					class="flex flex-wrap gap-2 border-t border-base-300 pt-4 sm:pt-5"
				>
					<WashButton
						className="btn btn-primary btn-sm"
						onClick={addDraft}
						disabled={!storeId}
					>
						<LucidePlus className="size-4" />
						{m.med_order_int_add_to_list()}
					</WashButton>
					<WashButton
						className="btn btn-secondary btn-sm"
						onClick={persistBatch}
						disabled={!storeId || draftLines.length === 0 || isBusy}
						loading={isBusy}
					>
						<LucideCircleCheck className="size-4" />
						{editingBatchId
							? m.med_order_int_update_order()
							: m.med_order_int_save_order()}
					</WashButton>
				</div>
						</div>
					</WashCardBody>
				</WashCard>
			</div>
		</div>

		<WashCard className="min-w-0">
			<WashCardBody className="min-w-0 gap-2">
			<h2 class="text-base font-semibold">
				{m.med_order_int_draft_title()}
			</h2>
			<div class="flex min-h-[14rem] min-w-0 flex-col">
				<MariTable
					rows={draftLines}
					columns={draftColumns}
					bind:currentPage={draftCurrentPage}
					bind:pageSize={draftPageSizeStr}
					showRefreshButton={false}
					emptyMessage={m.medication_order_internal_sales_empty()}
					showRowActions={true}
					actionsHeader={m.actions()}
					actionsVariant="none"
					enableColumnFilters={true}
					totalRowCount={draftLines.length}
					fillParent={true}
					bind:columnFilters={draftColumnFilters}
				>
					{#snippet rowActions(row, localIdx)}
						<MariTableRowActionGroup>
							<MariTableIconAction
								tooltipText={m.med_order_int_tooltip_move_up()}
								color="info"
								disabled={globalDraftIndex(localIdx) <= 0}
								onClick={() =>
									moveDraftLine(globalDraftIndex(localIdx), -1)}
							>
								{#snippet icon()}
									<LucideChevronRight className="size-4 -rotate-90" />
								{/snippet}
							</MariTableIconAction>
							<MariTableIconAction
								tooltipText={m.med_order_int_tooltip_move_down()}
								color="info"
								disabled={globalDraftIndex(localIdx) >=
									draftLines.length - 1}
								onClick={() =>
									moveDraftLine(globalDraftIndex(localIdx), 1)}
							>
								{#snippet icon()}
									<LucideChevronRight className="size-4 rotate-90" />
								{/snippet}
							</MariTableIconAction>
							<MariTableIconAction
								tooltipText={m.med_order_int_tooltip_delete()}
								color="error"
								onClick={() => removeDraft((row as DraftLine)._key)}
							>
								{#snippet icon()}
									<LucideTrash2 className="size-4" />
								{/snippet}
							</MariTableIconAction>
						</MariTableRowActionGroup>
					{/snippet}
				</MariTable>
			</div>
			</WashCardBody>
		</WashCard>
	</div>
{/if}
