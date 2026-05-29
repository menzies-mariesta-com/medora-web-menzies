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
	import { m } from '$lib/paraglide/messages';

	let {
		storeId,
		itemLabel = '',
		batchAllocations = $bindable([]),
		iumList = $bindable([] as ConsumptionDraftLineIum[]),
		issueQtyPurchase = $bindable(''),
		unitSalePrice = $bindable('0'),
		disabled = false
	}: {
		storeId: number;
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
			batchAllocations.length === 0 ||
			!chosenIum
	);

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
