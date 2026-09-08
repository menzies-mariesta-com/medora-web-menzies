<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSearchSelect from '$lib/component/wash/search-select/WashSearchSelect.svelte';
	import MedOrderBatchAllocDialogContent, {
		type MedOrderBatchAllocDialogResult
	} from '$lib/component/own/local/private/medora/medication-order/MedOrderBatchAllocDialogContent.svelte';
	import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/medora/department-consumption-detail.type';
	import type { ConsumptionDraftLineIum } from '$lib/model/type/medora/department-consumption-detail.type';
	import type { InvPricingModuleCode } from '$lib/model/type/medora/inv-pricing-module.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import {
		syncMedOrderFefoAllocations,
		syncQtyOutFromAllocations
	} from '$lib/tool/medication-order/med-order-line-inventory.util';
	import {
		fetchSalePricePreview,
		primaryBatchIdFromAllocations
	} from '$lib/tool/inventory/sale-price-preview.client.util';
	import {
		medOrderOutUnitOptionsFromIumList,
		normalizeInternalMedOrderOutUnit,
		outQtyToPurchaseQtyString,
		purchaseQtyToOutQtyString,
		resolveMedOrderIumForOutUnit,
		unitSalePriceForOutUnit
	} from '$lib/tool/inventory/med-order-out-qty.util';
	import { trimInventoryNumericDisplay } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import { m } from '$lib/paraglide/messages';

	let {
		hospitalId,
		storeId,
		itemId,
		itemLabel = '',
		batchAllocations = $bindable([]),
		iumList = $bindable([] as ConsumptionDraftLineIum[]),
		itemUnitMasterIdStr = $bindable(''),
		qtyOut = $bindable(''),
		outUnitIdStr = $bindable(''),
		unitSalePrice = $bindable('0'),
		pricingModule,
		outUnitMode = 'selectable',
		disabled = false
	}: {
		hospitalId: string;
		storeId: number;
		itemId: number;
		itemLabel?: string;
		batchAllocations: ConsumptionBatchAllocationDraft[];
		iumList: ConsumptionDraftLineIum[];
		/** Synced from resolved conversion for the chosen sale unit (not user-picked). */
		itemUnitMasterIdStr?: string;
		qtyOut: string;
		outUnitIdStr: string;
		unitSalePrice: string;
		pricingModule: InvPricingModuleCode;
		/** Internal sales: always issue (smallest) unit. External: user picks sale unit. */
		outUnitMode?: 'fixed-issue' | 'selectable';
		disabled?: boolean;
	} = $props();

	const outUnitOptions = $derived(medOrderOutUnitOptionsFromIumList(iumList));

	const outUnitId = $derived(Number(outUnitIdStr) || 0);

	const chosenIum = $derived.by(() => {
		if (outUnitMode === 'fixed-issue') return iumList[0] ?? null;
		return resolveMedOrderIumForOutUnit(
			iumList,
			outUnitId,
			Number(itemUnitMasterIdStr) || null
		);
	});

	const showOutUnitSelect = $derived(outUnitMode === 'selectable');

	const outUnitName = $derived(
		outUnitMode === 'fixed-issue' && chosenIum
			? chosenIum.issueUnitName?.trim() || 'Issue unit'
			: (outUnitOptions.find((o) => o.value === outUnitIdStr)?.label ?? '')
	);

	const outUnitInvalidateKey = $derived(
		`${itemId}:${iumList.map((u) => u.id).join(',')}:${outUnitOptions.map((o) => o.value).join(',')}`
	);

	const pickStockDisabled = $derived(
		disabled ||
			storeId <= 0 ||
			itemId <= 0 ||
			batchAllocations.length === 0 ||
			!chosenIum ||
			outUnitId <= 0
	);

	let previewLoading = $state(false);
	let previewError = $state(false);

	$effect(() => {
		if (iumList.length === 0) {
			outUnitIdStr = '';
			itemUnitMasterIdStr = '';
			return;
		}
		if (outUnitMode === 'fixed-issue') {
			const ium = iumList[0];
			if (!ium) return;
			const normalized = normalizeInternalMedOrderOutUnit(
				qtyOut,
				Number(outUnitIdStr) || 0,
				ium
			);
			if (
				normalized.qtyOut !== qtyOut ||
				String(normalized.outUnitId) !== outUnitIdStr
			) {
				qtyOut = normalized.qtyOut;
				outUnitIdStr = String(normalized.outUnitId);
			}
			itemUnitMasterIdStr = String(ium.id);
			return;
		}
		const options = outUnitOptions;
		if (options.length === 0) {
			outUnitIdStr = '';
			itemUnitMasterIdStr = '';
			return;
		}
		if (!options.some((o) => o.value === outUnitIdStr)) {
			outUnitIdStr = options[0]!.value;
		}
		const resolved = resolveMedOrderIumForOutUnit(
			iumList,
			Number(outUnitIdStr) || 0,
			Number(itemUnitMasterIdStr) || null
		);
		if (resolved) {
			const nextId = String(resolved.id);
			if (itemUnitMasterIdStr !== nextId) itemUnitMasterIdStr = nextId;
		}
	});

	async function searchOutUnits(query: string) {
		const q = query.trim().toLowerCase();
		if (!q) return outUnitOptions;
		return outUnitOptions.filter((o) =>
			o.label.toLowerCase().includes(q)
		);
	}

	async function getOutUnitLabelForValue(value: string) {
		return outUnitOptions.find((o) => o.value === value)?.label ?? '';
	}

	function onOutUnitChange(nextId: string) {
		const prevId = Number(outUnitIdStr) || 0;
		const next = Number(nextId) || 0;
		const prevIum =
			prevId > 0
				? resolveMedOrderIumForOutUnit(
						iumList,
						prevId,
						Number(itemUnitMasterIdStr) || null
					)
				: null;
		const nextIum =
			next > 0
				? resolveMedOrderIumForOutUnit(iumList, next, null)
				: null;
		if (
			prevIum &&
			nextIum &&
			prevId > 0 &&
			next > 0 &&
			prevId !== next &&
			qtyOut.trim()
		) {
			const purch = outQtyToPurchaseQtyString(qtyOut, prevId, prevIum);
			if (purch) {
				qtyOut = purchaseQtyToOutQtyString(purch, next, nextIum);
			}
		}
		outUnitIdStr = nextId;
		if (nextIum) itemUnitMasterIdStr = String(nextIum.id);
		applyFefoFromSaleQty();
	}

	async function refreshUnitSalePricePreview() {
		if (!hospitalId || storeId <= 0 || itemId <= 0 || outUnitId <= 0) {
			unitSalePrice = '0';
			return;
		}
		const batchId = primaryBatchIdFromAllocations(batchAllocations);
		if (batchId == null || !chosenIum) {
			unitSalePrice = '0';
			return;
		}
		previewLoading = true;
		previewError = false;
		try {
			const result = await fetchSalePricePreview({
				hospitalId,
				storeId,
				itemId,
				batchId,
				module: pricingModule
			});
			if (!result) {
				previewError = true;
				unitSalePrice = '0';
				return;
			}
			unitSalePrice = unitSalePriceForOutUnit(result, outUnitId, {
				purchaseUnitId: chosenIum.purchaseUnitId,
				issueUnitId: chosenIum.issueUnitId
			});
		} catch {
			previewError = true;
			unitSalePrice = '0';
		} finally {
			previewLoading = false;
		}
	}

	$effect(() => {
		void hospitalId;
		void storeId;
		void itemId;
		void batchAllocations;
		void pricingModule;
		void outUnitId;
		void chosenIum?.id;
		void refreshUnitSalePricePreview();
	});

	function applyFefoFromSaleQty() {
		if (!chosenIum || batchAllocations.length === 0 || outUnitId <= 0) {
			return;
		}
		batchAllocations = syncMedOrderFefoAllocations({
			batchAllocations,
			qtyOut,
			outUnitId,
			ium: chosenIum
		});
	}

	async function openBatchPickDialog() {
		if (pickStockDisabled) return;
		const result = await dialogService.open<MedOrderBatchAllocDialogResult>({
			title: m.med_order_batch_pick_title(),
			modalClassName: 'max-w-4xl',
			component: MedOrderBatchAllocDialogContent,
			props: {
				itemLabel,
				initialAllocations: batchAllocations.map((a) => ({ ...a })),
				initialQtyOut: qtyOut,
				outUnitId,
				ium: chosenIum,
				disabled
			}
		});
		if (!result.confirmed || !result.data) return;
		batchAllocations = result.data.batchAllocations.map((a) => ({
			...a
		}));
		qtyOut =
			result.data.qtyOut.trim() ||
			syncQtyOutFromAllocations(
				batchAllocations,
				outUnitId,
				chosenIum!
			);
	}

	const unitSalePriceDisplay = $derived(
		unitSalePrice.trim()
			? trimInventoryNumericDisplay(unitSalePrice.trim(), 4)
			: '—'
	);
</script>

<div class="flex w-full min-w-0 flex-col gap-4 border-t border-base-200 pt-4">
	{#if showOutUnitSelect}
		<div class="flex min-w-0 flex-col gap-1.5">
			<label>{m.med_order_out_unit()}</label>
			<WashSearchSelect
				value={outUnitIdStr}
				searchFn={searchOutUnits}
				getLabelForValue={getOutUnitLabelForValue}
				onChange={onOutUnitChange}
				placeholder={m.med_order_out_unit()}
				disabled={disabled || outUnitOptions.length === 0}
				invalidateKey={outUnitInvalidateKey}
				className="w-full"
				minSearchLength={0}
				debounceMs={0}
			/>
		</div>
	{/if}
	<div class="flex min-w-0 flex-col gap-1.5">
		<label>
			{m.med_order_sale_qty()}
			{#if outUnitName}
				<span class="font-normal opacity-70">({outUnitName})</span>
			{/if}
		</label>
		<div
			class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3"
		>
			<WashInputField
				nameText="qtyOut"
				bind:value={qtyOut}
				inputType="text"
				className="min-w-0 flex-1"
				minLength={0}
				{disabled}
				oninput={() => applyFefoFromSaleQty()}
			/>
			<WashButton
				type="button"
				className="btn btn-outline  shrink-0"
				disabled={pickStockDisabled}
				onClick={() => void openBatchPickDialog()}
			>
				{m.med_order_pick_stock()}
			</WashButton>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1.5">
		<label>
			{m.med_order_unit_sale_price()}
			{#if outUnitName}
				<span class="font-normal opacity-70">({outUnitName})</span>
			{/if}
		</label>
		<div
			class="input-bordered input flex w-full items-center gap-2 bg-base-200/50 opacity-90"
			aria-live="polite"
		>
			{#if previewLoading}
				<span
					class="loading loading-xs loading-spinner"
					aria-hidden="true"
				></span>
			{/if}
			<span class="font-medium tabular-nums">{unitSalePriceDisplay}</span>
		</div>
		{#if previewError}
			<p class="text-xs text-error">
				{m.inv_pricing_preview_unavailable()}
			</p>
		{:else}
			<p class="text-xs opacity-70">{m.inv_pricing_preview_hint()}</p>
		{/if}
	</div>
</div>
