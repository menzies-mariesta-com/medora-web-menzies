<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUISearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import LucideListOrdered from '$lib/component/own/library/lucide/LucideListOrdered.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideCircleCheck from '$lib/component/own/library/lucide/LucideCircleCheck.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideShoppingBasket from '$lib/component/own/library/lucide/LucideShoppingBasket.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { m } from '$lib/paraglide/messages';
	import type {
		MedicationOrderBatchHistoryRow,
		MedicationOrderCheckoutResponse,
		MedicationOrderMastersResponse,
		MedicationOrderLineInput
	} from '$lib/model/type/heka/medication-order.type';
	import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/heka/department-consumption-detail.type';
	import type { ConsumptionDraftLineIum } from '$lib/model/type/heka/department-consumption-detail.type';
	import MedicationOrderInventoryFields from '$lib/component/own/local/private/heka/medication-order/MedicationOrderInventoryFields.svelte';
	import {
		defaultUnitSalePriceFromAllocations,
		hydrateMedOrderItemMeta,
		lineTotal,
		loadMedOrderIumList,
		refreshMedOrderBatchAllocations,
		sumAllocationPurchaseQty,
		syncMedOrderFefoAllocations,
		validateMedOrderInventoryLine,
		applyDraftReservationsToLots
	} from '$lib/tool/medication-order/med-order-line-inventory.util';
	import { isMedOrderStartBeforeToday } from '$lib/tool/medication-order/med-order-start-date.util';
	import { tick, untrack } from 'svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	function apiRoot() {
		return `/api/heka/hospital/${hospitalId}/home/medication-order/external-sales`;
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
	let lastItemSearchRows = $state<
		{
			id: number;
			itemName: string | null;
			displayPrice: string | null;
		}[]
	>([]);
	let selectedItem = $state<{
		id: number;
		itemName: string | null;
		displayPrice: string | null;
	} | null>(null);

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

	let issueQtyPurchase = $state('');
	let unitSalePrice = $state('0');
	let batchAllocations = $state<ConsumptionBatchAllocationDraft[]>([]);
	let iumList = $state<ConsumptionDraftLineIum[]>([]);

	let paymentMethod = $state('cash');
	let amountPaid = $state('');
	let batchIsPaid = $state(false);
	let lastReceipt = $state<MedicationOrderCheckoutResponse | null>(null);

	let isBusy = $state(false);
	let editingBatchId = $state(0);

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
			s += lineTotal(ln.issueQtyPurchase, ln.unitSalePrice);
		}
		return s.toFixed(2);
	});

	let draftLines = $state<DraftLine[]>([]);
	let draftCurrentPage = $state(1);
	let draftPageSizeStr = $state('10');
	let draftColumnFilters = $state<Record<string, string>>({});

	/** — History */
	let historyOpen = $state(false);
	let historyRows = $state<MedicationOrderBatchHistoryRow[]>([]);
	let storeNameById = $state<Record<number, string>>({});
	let historyCurrentPage = $state(1);
	let historyPageSizeStr = $state('10');
	let historyColumnFilters = $state<Record<string, string>>({});

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
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/pharmacy-generic`,
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
		const rows = (await res.json()) as typeof lastItemSearchRows;
		lastItemSearchRows = rows;
		return rows.map((it) => ({
			value: String(it.id),
			label: `${it.itemName?.trim() || '—'}${it.displayPrice != null ? ` · ${it.displayPrice}` : ''}`
		}));
	}

	async function getItemLabelForValue(
		idStr: string
	): Promise<string> {
		if (!idStr) return '';
		if (selectedItem && String(selectedItem.id) === idStr) {
			return `${selectedItem.itemName?.trim() || '—'}${selectedItem.displayPrice != null ? ` · ${selectedItem.displayPrice}` : ''}`;
		}
		if (!hospitalId) return `Item #${idStr}`;
		const res = await fetch(
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?id=${encodeURIComponent(idStr)}`,
			{ credentials: 'include' }
		);
		if (!res.ok) return `Item #${idStr}`;
		const d = (await res.json()) as { itemName?: string | null };
		return d.itemName?.trim() || `Item #${idStr}`;
	}

	const dash = () => m.med_order_int_not_applicable();

	const draftColumns = $derived.by((): MariTableColumn<DraftLine>[] => {
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
				format: (_v, row) => row.issueQtyPurchase
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
					lineTotal(row.issueQtyPurchase, row.unitSalePrice).toFixed(2)
			}
		];
	});

	const historyColumns = $derived.by(
		(): MariTableColumn<MedicationOrderBatchHistoryRow>[] => [
			{
				id: 'id',
				header: m.med_order_int_hist_id(),
				widthClass: 'min-w-[4rem]',
				filterable: true,
				field: 'id',
				format: (v) => String(v ?? dash())
			},
			{
				id: 'hospitalId',
				header: m.med_order_int_hist_hospital_id(),
				widthClass: 'min-w-[12rem] max-w-[14rem] font-mono text-xs',
				filterable: true,
				field: 'hospitalId',
				format: (v) => (typeof v === 'string' && v ? v : dash())
			},
			{
				id: 'visitId',
				header: m.med_order_int_hist_visit_id(),
				widthClass: 'min-w-[5rem]',
				filterable: true,
				field: 'visitId',
				format: (v) => (v != null && v !== '' ? String(v) : dash())
			},
			{
				id: 'batchNo',
				header: m.med_order_int_batch(),
				widthClass: 'min-w-[8rem]',
				filterable: true,
				field: 'batchNo'
			},
			{
				id: 'store',
				header: m.med_order_int_store(),
				widthClass: 'min-w-[10rem]',
				filterable: true,
				format: (_v, row) =>
					storeNameById[row.storeId] ?? String(row.storeId)
			},
			{
				id: 'extCustomerName',
				header: m.med_order_int_hist_ext_customer(),
				widthClass: 'min-w-[8rem]',
				filterable: true,
				field: 'extCustomerName',
				format: (v) =>
					v != null && String(v).trim() ? String(v) : dash()
			},
			{
				id: 'advisingDoctor',
				header: m.med_order_int_hist_advising_doctor(),
				widthClass: 'min-w-[8rem]',
				filterable: true,
				field: 'advisingDoctor',
				format: (v) =>
					v != null && String(v).trim() ? String(v) : dash()
			},
			{
				id: 'lineCount',
				header: m.med_order_int_hist_lines(),
				widthClass: 'min-w-[4rem]',
				filterable: true,
				field: 'lineCount',
				format: (v) => String(v ?? dash())
			},
			{
				id: 'createdAt',
				header: m.created_at(),
				widthClass: 'min-w-[11rem]',
				filterable: false,
				format: (_v, row) =>
					toDateTimeLocalValue(new Date(row.createdAt))
			},
			{
				id: 'updatedAt',
				header: m.updated_at(),
				widthClass: 'min-w-[11rem]',
				filterable: false,
				format: (_v, row) =>
					toDateTimeLocalValue(new Date(row.updatedAt))
			},
			{
				id: 'createdByName',
				header: m.med_order_int_hist_created_by(),
				widthClass: 'min-w-[9rem]',
				filterable: true,
				field: 'createdByName',
				format: (v) =>
					v != null && String(v).trim() ? String(v) : dash()
			},
			{
				id: 'createdBy',
				header: m.med_order_int_hist_created_by_id(),
				widthClass: 'min-w-[10rem] max-w-[12rem] font-mono text-xs',
				filterable: true,
				field: 'createdBy',
				format: (v) => (v != null && String(v) ? String(v) : dash())
			},
			{
				id: 'updatedByName',
				header: m.med_order_int_hist_updated_by(),
				widthClass: 'min-w-[9rem]',
				filterable: true,
				field: 'updatedByName',
				format: (v) =>
					v != null && String(v).trim() ? String(v) : dash()
			},
			{
				id: 'updatedBy',
				header: m.med_order_int_hist_updated_by_id(),
				widthClass: 'min-w-[10rem] max-w-[12rem] font-mono text-xs',
				filterable: true,
				field: 'updatedBy',
				format: (v) => (v != null && String(v) ? String(v) : dash())
			}
		]
	);

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
			const lots = await refreshMedOrderBatchAllocations(
				hospitalId,
				storeId,
				itemId
			);
			batchAllocations = applyDraftReservationsToLots(
				lots,
				draftLines,
				itemId,
				iumList[0] ?? null
			);
			issueQtyPurchase = '';
			unitSalePrice =
				defaultUnitSalePriceFromAllocations(batchAllocations);
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
		itemValueStr = String(line.itemMasterId);
		selectedItem = {
			id: line.itemMasterId,
			itemName: line._itemName,
			displayPrice: null
		};
		const row = {
			id: line.itemMasterId,
			itemName: line._itemName,
			displayPrice: null as string | null
		};
		lastItemSearchRows = [
			row,
			...lastItemSearchRows.filter((r) => r.id !== line.itemMasterId)
		];
		issueQtyPurchase = line.issueQtyPurchase;
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
		issueQtyPurchase = '';
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
		lastReceipt = null;
		resetNewLineForm();
	}

	function addDraft() {
		if (
			!editingBatchId &&
			(!customerName.trim() || !advisingDoctor.trim())
		) {
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

		const ium = iumList[0] ?? null;
		const lotsForValidate = applyDraftReservationsToLots(
			batchAllocations,
			draftLines,
			selectedItem.id,
			ium
		);
		const syncedLots = syncMedOrderFefoAllocations({
			batchAllocations: lotsForValidate,
			issueQtyPurchase,
			ium
		});
		const invErr = validateMedOrderInventoryLine({
			batchAllocations: syncedLots,
			ium,
			issueQtyPurchase,
			unitSalePrice
		});
		if (invErr) {
			toastService.addToast(invErr, StatusColorEnum.ERROR);
			return;
		}
		const iumId = iumList[0]!.id;
		const qtySum = sumAllocationPurchaseQty(syncedLots);
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
			issueQtyPurchase: qtySum || issueQtyPurchase.trim(),
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
		draftLines = draftLines.filter((d) => d._key !== k);
	}

	async function persistBatch() {
		if (
			!editingBatchId &&
			(!customerName.trim() || !advisingDoctor.trim())
		) {
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
				if (!res.ok) throw new Error(await res.text());
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
			if (!res.ok) throw new Error(await res.text());
			lastReceipt =
				(await res.json()) as MedicationOrderCheckoutResponse;
			batchIsPaid = true;
			toastService.addToast(
				m.med_order_checkout_success(),
				StatusColorEnum.SUCCESS
			);
		} catch (e) {
			toastService.addErrorToast(m.med_order_checkout_failed(), e);
		} finally {
			isBusy = false;
		}
	}

	function printReceipt() {
		if (!lastReceipt) return;
		const w = window.open('', '_blank', 'width=480,height=720');
		if (!w) return;
		const r = lastReceipt;
		const rows = r.lines
			.map(
				(ln) =>
					`<tr><td>${ln.itemName ?? '—'}</td><td>${ln.issueQtyPurchase}</td><td>${ln.unitSalePrice}</td><td>${ln.lineTotal}</td></tr>`
			)
			.join('');
		w.document.write(`<!DOCTYPE html><html><head><title>${r.receiptNo}</title></head><body>
<h2>${m.med_order_receipt_print()}</h2>
<p><strong>${r.receiptNo}</strong></p>
<p>${r.batch.extCustomerName ?? ''} · ${r.batch.advisingDoctor ?? ''}</p>
<table border="1" cellpadding="4" style="border-collapse:collapse;width:100%"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
<p>${m.med_order_amount_due()}: ${r.amountDue} · ${m.med_order_amount_paid()}: ${r.amountPaid}</p>
</body></html>`);
		w.document.close();
		w.print();
	}

	async function openHistory() {
		historyOpen = true;
		historyCurrentPage = 1;
		const u = new URL(apiRoot(), window.location.origin);
		u.searchParams.set('mode', 'batch.list');
		const res = await fetch(u, { credentials: 'include' });
		if (!res.ok) {
			historyRows = [];
			return;
		}
		historyRows =
			(await res.json()) as MedicationOrderBatchHistoryRow[];
		const r = await fetch(`${apiRoot()}?mode=stores.search`, {
			credentials: 'include'
		});
		if (r.ok) {
			const stores = (await r.json()) as {
				id: number;
				storeName: string | null;
			}[];
			const mp: Record<number, string> = {};
			for (const s of stores) mp[s.id] = s.storeName ?? `#${s.id}`;
			storeNameById = mp;
		}
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
			issueQtyPurchase: String(ln.issueQtyPurchase ?? '1'),
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
			`/api/heka/hospital/${hospitalId}/home/inventory-setup/item-master?id=${itemMasterId}`,
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
			payment: { amountPaid: string } | null;
		};
		if (!masters) await loadMasters();
		historyOpen = false;
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

	async function reorderAsNewBatch(sourceBatchId: number) {
		const c = await dialogService.open({
			title: m.med_order_int_reorder_append_title(),
			message: m.med_order_int_reorder_append_confirm(),
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
					mode: 'batch.reorder',
					sourceBatchId
				})
			});
			if (!res.ok) throw new Error(await res.text());
			void (await res.json());
			toastService.addToast(
				m.med_order_int_reorder_line_appended(),
				StatusColorEnum.SUCCESS
			);
			await openHistory();
		} catch (e) {
			toastService.addErrorToast(m.med_order_int_save_failed(), e);
		} finally {
			isBusy = false;
		}
	}

	async function deleteHistoryBatch(id: number) {
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
					batchId: id
				})
			});
			if (!res.ok) throw new Error(await res.text());
			toastService.addToast(
				m.med_order_int_deleted(),
				StatusColorEnum.SUCCESS
			);
			historyRows = historyRows.filter((b) => b.id !== id);
			if (editingBatchId === id) {
				historyOpen = false;
				resetEditing();
			}
		} catch (e) {
			toastService.addErrorToast(m.med_order_int_delete_failed(), e);
		} finally {
			isBusy = false;
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
			historyOpen = false;
			resetEditing();
		} catch (e) {
			toastService.addErrorToast(m.med_order_int_delete_failed(), e);
		} finally {
			isBusy = false;
		}
	}
</script>

<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
	<h1 class="text-lg font-semibold">
		{m.medication_order_external_sales_title()}
	</h1>
	<div class="flex flex-wrap items-center gap-2">
		{#if editingBatchId}
			<span class="text-sm text-warning"
				>{m.med_order_int_editing()}</span
			>
			<DaisyUiButton
				className="d-btn-ghost d-btn-sm"
				onClick={resetEditing}
			>
				{m.med_order_int_cancel_edit()}
			</DaisyUiButton>
			<DaisyUiButton
				className="d-btn-error d-btn-ghost d-btn-sm"
				onClick={deleteCurrentBatch}
				disabled={isBusy}
			>
				<LucideTrash2 className="size-4" />
				{m.delete_data()}
			</DaisyUiButton>
		{/if}
		<DaisyUiButton
			className="d-btn d-btn-ghost d-btn-sm"
			onClick={openHistory}
		>
			<LucideListOrdered className="size-4" />
			{m.med_order_int_history()}
		</DaisyUiButton>
	</div>
</div>

<DaisyUiCard>
	<DaisyUiCardBody className="p-4 sm:p-6">
		<div
			class="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6"
		>
			<div
				class="grid grid-cols-1 gap-6 border-b border-base-200 pb-5 lg:grid-cols-3 lg:items-start"
			>
				<div
					class="flex min-w-0 flex-col items-stretch gap-4 lg:col-span-3"
				>
					<div
						class="flex w-full flex-wrap items-end justify-between gap-4"
					>
						<div class="flex min-w-0 flex-1 flex-col gap-1.5">
							<DaisyUiLabel className="shrink-0"
								>{m.med_order_ext_customer_name()}</DaisyUiLabel
							>
							<DaisyUiInputField
								nameText="ext-cust"
								bind:value={customerName}
								inputPlaceholderText={m.med_order_ext_customer_placeholder()}
								className="w-full"
								minLength={0}
								disabled={editingBatchId > 0 || batchIsPaid}
							/>
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-1.5">
							<DaisyUiLabel className="shrink-0"
								>{m.med_order_ext_advising_doctor()}</DaisyUiLabel
							>
							<DaisyUiInputField
								nameText="ext-doc"
								bind:value={advisingDoctor}
								inputPlaceholderText={m.med_order_ext_advising_doctor_placeholder()}
								className="w-full"
								minLength={0}
								disabled={editingBatchId > 0 || batchIsPaid}
							/>
						</div>
					</div>
					<div class="flex w-full min-w-0 flex-col gap-1.5">
						<DaisyUiLabel className="shrink-0"
							>{m.med_order_int_store()}</DaisyUiLabel
						>
						<DaisyUISearchSelect
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
					<div class="flex w-full min-w-0 flex-col gap-1.5">
						<DaisyUiLabel className="shrink-0"
							>{m.med_order_int_pharmacy_generic()}</DaisyUiLabel
						>
						<DaisyUISearchSelect
							bind:value={pharmacyGenericId}
							options={genericOptions}
							placeholder={m.med_order_int_all_generics()}
							className="w-full"
							disabled={batchIsPaid}
						/>
					</div>
					<div class="flex w-full min-w-0 flex-col gap-1.5">
						<DaisyUiLabel className="shrink-0"
							>{m.med_order_int_item()}</DaisyUiLabel
						>
						<DaisyUISearchSelect
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
						{#if selectedItem?.displayPrice != null}
							<p class="text-xs text-base-content/70">
								{m.med_order_int_price()}: {selectedItem.displayPrice}
							</p>
						{/if}
					</div>
					{#if selectedItem && storeId > 0}
						<MedicationOrderInventoryFields
							storeId={storeId}
							itemLabel={selectedItem.itemName ?? ''}
							bind:batchAllocations
							bind:iumList
							bind:issueQtyPurchase
							bind:unitSalePrice
							disabled={batchIsPaid}
						/>
					{/if}
				</div>
			</div>

			<div
				class="flex flex-wrap gap-2 border-t border-base-300 pt-4 sm:pt-5"
			>
				<DaisyUiButton
					className="d-btn d-btn-primary d-btn-sm"
					onClick={addDraft}
					disabled={batchIsPaid ||
						!storeId ||
						(!editingBatchId &&
							(!customerName.trim() || !advisingDoctor.trim()))}
				>
					<LucidePlus className="size-4" />
					{m.med_order_int_add_to_list()}
				</DaisyUiButton>
				<DaisyUiButton
					className="d-btn d-btn-secondary d-btn-sm"
					onClick={persistBatch}
					disabled={batchIsPaid ||
						!storeId ||
						draftLines.length === 0 ||
						isBusy ||
						(!editingBatchId &&
							(!customerName.trim() || !advisingDoctor.trim()))}
					loading={isBusy}
				>
					<LucideCircleCheck className="size-4" />
					{editingBatchId
						? m.med_order_int_update_order()
						: m.med_order_int_save_order()}
				</DaisyUiButton>
			</div>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>

{#if editingBatchId && draftLines.length > 0}
	<DaisyUiCard className="mt-5">
		<DaisyUiCardBody className="gap-4">
			<h2 class="text-base font-semibold">{m.med_order_checkout_title()}</h2>
			{#if batchIsPaid}
				<p class="text-sm text-success">{m.med_order_paid_locked()}</p>
				{#if lastReceipt}
					<DaisyUiButton
						className="d-btn d-btn-sm"
						onClick={printReceipt}
					>
						{m.med_order_receipt_print()}
					</DaisyUiButton>
				{/if}
			{:else}
				<p class="text-sm">
					{m.med_order_amount_due()}: <strong>{draftTotal}</strong>
				</p>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div class="flex flex-col gap-1">
						<DaisyUiLabel>{m.med_order_payment_method()}</DaisyUiLabel>
						<select
							class="d-select d-select-bordered w-full"
							bind:value={paymentMethod}
						>
							<option value="cash">{m.med_order_payment_cash()}</option>
							<option value="card">{m.med_order_payment_card()}</option>
						</select>
					</div>
					<div class="flex flex-col gap-1 sm:col-span-2">
						<DaisyUiLabel>{m.med_order_amount_paid()}</DaisyUiLabel>
						<DaisyUiInputField
							nameText="amountPaid"
							bind:value={amountPaid}
							inputType="text"
							className="w-full"
							minLength={0}
						/>
					</div>
				</div>
				<DaisyUiButton
					className="d-btn d-btn-primary d-btn-sm"
					onClick={checkoutBatch}
					disabled={isBusy}
					loading={isBusy}
				>
					{m.med_order_pay_now()}
				</DaisyUiButton>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
{/if}

<DaisyUiCard className="mt-5">
	<DaisyUiCardBody className="gap-2">
		<h2 class="text-base font-semibold">
			{m.med_order_int_draft_title()}
		</h2>
		<div class="min-h-[14rem] min-w-0 {TableEnum.HEIGHT_SMALL}">
			<MariTable
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
			>
				{#snippet rowActions(row, localIdx)}
					<td class="w-0 text-right whitespace-nowrap">
						<div
							class="inline-flex max-w-full flex-nowrap items-center justify-end gap-0.5"
						>
							<DaisyUiButton
								className="d-btn-ghost d-btn-xs d-btn-square"
								title={m.med_order_int_move_up_aria()}
								disabled={globalDraftIndex(localIdx) <= 0 ||
									batchIsPaid}
								onClick={() =>
									moveDraftLine(globalDraftIndex(localIdx), -1)}
							>
								<LucideChevronRight
									className="size-4 -rotate-90"
								/>
							</DaisyUiButton>
							<DaisyUiButton
								className="d-btn-ghost d-btn-xs d-btn-square"
								title={m.med_order_int_move_down_aria()}
								disabled={globalDraftIndex(localIdx) >=
									draftLines.length - 1 || batchIsPaid}
								onClick={() =>
									moveDraftLine(globalDraftIndex(localIdx), 1)}
							>
								<LucideChevronRight
									className="size-4 rotate-90"
								/>
							</DaisyUiButton>
							<DaisyUiButton
								className="d-btn-ghost d-btn-error d-btn-xs d-btn-square"
								title={m.delete_data()}
								disabled={batchIsPaid}
								onClick={() =>
									removeDraft((row as DraftLine)._key)}
							>
								<LucideTrash2 className="size-4" />
							</DaisyUiButton>
						</div>
					</td>
				{/snippet}
			</MariTable>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>

{#if historyOpen}
	<dialog class="d-modal-open d-modal" open>
		<div
			class="d-modal-box flex max-h-[90vh] min-h-0 max-w-[min(96rem,98vw)] flex-col overflow-y-auto"
		>
			<h3 class="d-modal-title text-lg font-semibold">
				{m.med_order_int_history()}
			</h3>
			<div class="flex min-h-0 min-w-0 flex-1 flex-col py-2">
				<div
					class="min-h-[12rem] w-full min-w-0 {TableEnum.HEIGHT_SMALL}"
				>
					<MariTable
						rows={historyRows}
						columns={historyColumns}
						bind:currentPage={historyCurrentPage}
						bind:pageSize={historyPageSizeStr}
						showRefreshButton={true}
						refreshTooltip={m.refresh_data()}
						emptyMessage={m.med_order_int_no_batches()}
						showRowActions={true}
						actionsHeader={m.actions()}
						actionsVariant="none"
					enableColumnFilters={false}
						totalRowCount={historyRows.length}
						fillParent={true}
						bind:columnFilters={historyColumnFilters}
						on:refresh={openHistory}
					>
						{#snippet rowActions(row, _localIdx)}
							<td class="text-right">
								<div
									class="inline-flex max-w-full flex-nowrap items-center justify-end gap-1"
								>
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										title={m.edit_data()}
										disabled={isBusy}
										onClick={() =>
											loadBatchForEdit(
												(row as MedicationOrderBatchHistoryRow).id
											)}
									>
										<LucidePencil className="size-4" />
									</DaisyUiButton>
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										title={m.med_order_int_reorder_stagger_aria()}
										disabled={isBusy}
										onClick={() =>
											void reorderAsNewBatch(
												(row as MedicationOrderBatchHistoryRow).id
											)}
									>
										<LucideShoppingBasket className="size-4" />
									</DaisyUiButton>
									<DaisyUiButton
										className="d-btn-ghost d-btn-error d-btn-sm"
										title={m.delete_data()}
										disabled={isBusy}
										onClick={() =>
											deleteHistoryBatch(
												(row as MedicationOrderBatchHistoryRow).id
											)}
									>
										<LucideTrash2 className="size-4" />
									</DaisyUiButton>
								</div>
							</td>
						{/snippet}
					</MariTable>
				</div>
			</div>
			<div class="d-modal-action">
				<button
					type="button"
					class="d-btn"
					onclick={() => (historyOpen = false)}>{m.ok()}</button
				>
			</div>
		</div>
		<button
			type="button"
			class="d-modal-backdrop"
			aria-label={m.med_order_dialog_close_aria()}
			onclick={() => (historyOpen = false)}
		></button>
	</dialog>
{/if}
