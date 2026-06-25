<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import MedOrderBatchAllocDialogContent, {
		type MedOrderBatchAllocDialogResult
	} from '$lib/component/own/local/private/heka/medication-order/MedOrderBatchAllocDialogContent.svelte';
	import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/heka/department-consumption-detail.type';
	import type { ConsumptionDraftLineIum } from '$lib/model/type/heka/department-consumption-detail.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import {
		syncMedOrderFefoAllocations,
		syncIssueQtyFromAllocations
	} from '$lib/tool/medication-order/med-order-line-inventory.util';
	import {
		fetchSalePricePreview,
		primaryBatchIdFromAllocations
	} from '$lib/tool/inventory/sale-price-preview.client.util';
	import { trimInventoryNumericDisplay } from '$lib/tool/inventory/format-line-item-metric-tile-value.util';
	import { m } from '$lib/paraglide/messages';

	let {
		hospitalId,
		storeId,
		itemId,
		itemLabel = '',
		batchAllocations = $bindable([]),
		iumList = $bindable([] as ConsumptionDraftLineIum[]),
		issueQtyPurchase = $bindable(''),
		unitSalePrice = $bindable('0'),
		disabled = false
	}: {
		hospitalId: string;
		storeId: number;
		itemId: number;
		itemLabel?: string;
		batchAllocations: ConsumptionBatchAllocationDraft[];
		iumList: ConsumptionDraftLineIum[];
		issueQtyPurchase: string;
		unitSalePrice: string;
		disabled?: boolean;
	} = $props();

	const chosenIum = $derived(iumList[0] ?? null);

	const pickStockDisabled = $derived(
		disabled ||
			storeId <= 0 ||
			itemId <= 0 ||
			batchAllocations.length === 0 ||
			!chosenIum
	);

	let previewLoading = $state(false);
	let previewError = $state(false);

	async function refreshUnitSalePricePreview() {
		if (!hospitalId || storeId <= 0 || itemId <= 0) {
			unitSalePrice = '0';
			return;
		}
		const batchId = primaryBatchIdFromAllocations(batchAllocations);
		if (batchId == null) {
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
				module: 'MO'
			});
			if (!result) {
				previewError = true;
				unitSalePrice = '0';
				return;
			}
			unitSalePrice = result.unitSalePricePurchase;
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
		void refreshUnitSalePricePreview();
	});

	function applyFefoFromSaleQty() {
		if (!chosenIum || batchAllocations.length === 0) return;
		batchAllocations = syncMedOrderFefoAllocations({
			batchAllocations,
			issueQtyPurchase,
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
				initialIssueQtyPurchase: issueQtyPurchase,
				ium: chosenIum,
				disabled
			}
		});
		if (!result.confirmed || !result.data) return;
		batchAllocations = result.data.batchAllocations.map((a) => ({
			...a
		}));
		issueQtyPurchase =
			result.data.issueQtyPurchase.trim() ||
			syncIssueQtyFromAllocations(batchAllocations);
	}

	const unitSalePriceDisplay = $derived(
		unitSalePrice.trim()
			? trimInventoryNumericDisplay(unitSalePrice.trim(), 4)
			: '—'
	);
</script>

<div class="flex w-full min-w-0 flex-col gap-4 border-t border-base-200 pt-4">
	<div class="flex min-w-0 flex-col gap-1.5">
		<DaisyUiLabel>{m.med_order_sale_qty()}</DaisyUiLabel>
		<div
			class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3"
		>
			<DaisyUiInputField
				nameText="issueQtyPurchase"
				bind:value={issueQtyPurchase}
				inputType="text"
				className="min-w-0 flex-1"
				minLength={0}
				{disabled}
				oninput={() => applyFefoFromSaleQty()}
			/>
			<DaisyUiButton
				type="button"
				className="d-btn d-btn-outline  shrink-0"
				disabled={pickStockDisabled}
				onClick={() => void openBatchPickDialog()}
			>
				{m.med_order_pick_stock()}
			</DaisyUiButton>
		</div>
	</div>
	<div class="flex min-w-0 flex-col gap-1.5">
		<DaisyUiLabel>{m.med_order_unit_sale_price()}</DaisyUiLabel>
		<div
			class="d-input-bordered d-input flex w-full items-center gap-2 bg-base-200/50 opacity-90"
			aria-live="polite"
		>
			{#if previewLoading}
				<span
					class="d-loading d-loading-xs d-loading-spinner"
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
