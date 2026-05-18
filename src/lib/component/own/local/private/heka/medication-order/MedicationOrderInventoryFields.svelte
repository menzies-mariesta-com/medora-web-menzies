<script lang="ts">
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import InventoryBatchQtyPickTable from '$lib/component/own/local/private/heka/inventory/InventoryBatchQtyPickTable.svelte';
	import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/heka/department-consumption-detail.type';
	import type { ConsumptionDraftLineIum } from '$lib/model/type/heka/department-consumption-detail.type';
	import { syncMedOrderFefoAllocations } from '$lib/tool/medication-order/med-order-line-inventory.util';
	import { m } from '$lib/paraglide/messages';

	let {
		batchAllocations = $bindable([]),
		iumList = $bindable([] as ConsumptionDraftLineIum[]),
		issueQtyPurchase = $bindable(''),
		unitSalePrice = $bindable('0'),
		lineRemarks = $bindable(''),
		disabled = false
	}: {
		batchAllocations: ConsumptionBatchAllocationDraft[];
		iumList: ConsumptionDraftLineIum[];
		issueQtyPurchase: string;
		unitSalePrice: string;
		lineRemarks: string;
		disabled?: boolean;
	} = $props();

	const chosenIum = $derived(iumList[0] ?? null);
	const iumFactors = $derived(
		chosenIum
			? {
					purchaseConversionFactor:
						chosenIum.purchaseConversionFactor,
					issueConversionFactor: chosenIum.issueConversionFactor
				}
			: null
	);

	function applyFefoFromSaleQty() {
		if (!chosenIum || batchAllocations.length === 0) return;
		batchAllocations = syncMedOrderFefoAllocations({
			batchAllocations,
			issueQtyPurchase,
			ium: chosenIum
		});
	}
</script>

<div class="flex w-full min-w-0 flex-col gap-4 border-t border-base-200 pt-4">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<div class="flex min-w-0 flex-col gap-1.5">
			<DaisyUiLabel>{m.med_order_sale_qty()}</DaisyUiLabel>
			<DaisyUiInputField
				nameText="issueQtyPurchase"
				bind:value={issueQtyPurchase}
				inputType="text"
				className="w-full"
				minLength={0}
				{disabled}
				oninput={() => applyFefoFromSaleQty()}
			/>
		</div>
		<div class="flex min-w-0 flex-col gap-1.5">
			<DaisyUiLabel>{m.med_order_unit_sale_price()}</DaisyUiLabel>
			<DaisyUiInputField
				nameText="unitSalePrice"
				bind:value={unitSalePrice}
				inputType="text"
				className="w-full"
				minLength={0}
				{disabled}
			/>
		</div>
		</div>
	<div class="flex min-w-0 flex-col gap-1.5">
		<DaisyUiLabel>{m.med_order_line_remarks()}</DaisyUiLabel>
		<DaisyUiInputField
			nameText="lineRemarks"
			bind:value={lineRemarks}
			inputType="text"
			className="w-full"
			minLength={0}
			{disabled}
		/>
	</div>
	{#if batchAllocations.length > 0 && iumFactors}
		<InventoryBatchQtyPickTable
			bind:allocations={batchAllocations}
			factors={iumFactors}
			purchaseUnitLabel={chosenIum?.purchaseUnitName ?? ''}
			issueUnitLabel={chosenIum?.issueUnitName ?? ''}
			{disabled}
		/>
	{/if}
</div>
