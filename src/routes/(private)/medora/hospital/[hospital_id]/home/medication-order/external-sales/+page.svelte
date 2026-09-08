<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
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

	async function printReceipt() {
		if (!lastReceipt || !hospitalId) return;
		const r = lastReceipt;
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

	async function openHistory() {
		await dialogService.open({
			title: m.med_order_int_history(),
			component: MedicationOrderHistoryDialogContent,
			fullScreen: true,
			props: {
				apiRoot: apiRoot(),
				enableColumnFilters: false,
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
			payment: { amountPaid: string } | null;
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

<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
	<h1 class="text-lg font-semibold">
		{m.medication_order_external_sales_title()}
	</h1>
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
		>
			<LucideListOrdered className="size-4" />
			{m.med_order_int_history()}
		</WashButton>
	</div>
</div>

<WashCard>
	<WashCardBody className="p-4 sm:p-6">
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
							<label class="shrink-0">{m.med_order_ext_customer_name()}</label>
							<WashInputField
								nameText="ext-cust"
								bind:value={customerName}
								inputPlaceholderText={m.med_order_ext_customer_placeholder()}
								className="w-full"
								minLength={0}
								disabled={editingBatchId > 0 || batchIsPaid}
							/>
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-1.5">
							<label class="shrink-0">{m.med_order_ext_advising_doctor()}</label>
							<WashInputField
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
						<label class="shrink-0">{m.med_order_int_store()}</label>
						<WashSearchSelect
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
						<label class="shrink-0">{m.med_order_int_pharmacy_generic()}</label>
						<WashSearchSelect
							bind:value={pharmacyGenericId}
							options={genericOptions}
							placeholder={m.med_order_int_all_generics()}
							className="w-full"
							disabled={batchIsPaid}
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
				</div>
			</div>

			<div
				class="flex flex-wrap gap-2 border-t border-base-300 pt-4 sm:pt-5"
			>
				<WashButton
					className="btn btn-primary btn-sm"
					onClick={addDraft}
					disabled={batchIsPaid ||
						!storeId ||
						(!editingBatchId &&
							(!customerName.trim() || !advisingDoctor.trim()))}
				>
					<LucidePlus className="size-4" />
					{m.med_order_int_add_to_list()}
				</WashButton>
				<WashButton
					className="btn btn-secondary btn-sm"
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
				</WashButton>
			</div>
		</div>
	</WashCardBody>
</WashCard>

{#if editingBatchId && draftLines.length > 0}
	<WashCard className="mt-5">
		<WashCardBody className="gap-4">
			<h2 class="text-base font-semibold">{m.med_order_checkout_title()}</h2>
			{#if batchIsPaid}
				<p class="text-sm text-success">{m.med_order_paid_locked()}</p>
				{#if lastReceipt}
					<WashButton
						className="btn btn-sm"
						onClick={printReceipt}
					>
						{m.med_order_receipt_print()}
					</WashButton>
				{/if}
			{:else}
				<p class="text-sm">
					{m.med_order_amount_due()}: <strong>{draftTotal}</strong>
				</p>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div class="flex flex-col gap-1">
						<label>{m.med_order_payment_method()}</label>
						<select
							class="select select-bordered w-full"
							bind:value={paymentMethod}
						>
							<option value="cash">{m.med_order_payment_cash()}</option>
							<option value="card">{m.med_order_payment_card()}</option>
						</select>
					</div>
					<div class="flex flex-col gap-1 sm:col-span-2">
						<label>{m.med_order_amount_paid()}</label>
						<WashInputField
							nameText="amountPaid"
							bind:value={amountPaid}
							inputType="text"
							className="w-full"
							minLength={0}
						/>
					</div>
				</div>
				<WashButton
					className="btn btn-primary btn-sm"
					onClick={checkoutBatch}
					disabled={isBusy}
					loading={isBusy}
				>
					{m.med_order_pay_now()}
				</WashButton>
			{/if}
		</WashCardBody>
	</WashCard>
{/if}

<WashCard className="mt-5 min-w-0">
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
					<MariTableRowActionGroup>
						<MariTableIconAction
							tooltipText={m.med_order_int_tooltip_move_up()}
							color="info"
							disabled={globalDraftIndex(localIdx) <= 0 ||
								batchIsPaid}
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
								draftLines.length - 1 || batchIsPaid}
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
							disabled={batchIsPaid}
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
