<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import InventoryBatchQtyPickTable from '$lib/component/own/local/private/heka/inventory/InventoryBatchQtyPickTable.svelte';
	import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/heka/department-consumption-detail.type';
	import type { ConsumptionDraftLineIum } from '$lib/model/type/heka/department-consumption-detail.type';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import {
		sumAllocationPurchaseQty,
		syncMedOrderFefoAllocations
	} from '$lib/tool/medication-order/med-order-line-inventory.util';
	import { purchaseQtyToIssueQtyNumber } from '$lib/tool/inventory/purchase-issue-qty-convert.util';

	export type MedOrderBatchAllocDialogResult = {
		batchAllocations: ConsumptionBatchAllocationDraft[];
		issueQtyPurchase: string;
	};

	let {
		confirm,
		cancel,
		itemLabel,
		initialAllocations,
		initialIssueQtyPurchase,
		ium,
		disabled = false
	}: DialogSlotProps & {
		itemLabel: string;
		initialAllocations: ConsumptionBatchAllocationDraft[];
		initialIssueQtyPurchase: string;
		ium: ConsumptionDraftLineIum | null;
		disabled?: boolean;
	} = $props();

	const toast = new ToastService();

	let batchAllocations = $state<ConsumptionBatchAllocationDraft[]>(
		initialAllocations.map((a) => ({ ...a }))
	);

	const iumFactors = $derived(
		ium
			? {
					purchaseConversionFactor: ium.purchaseConversionFactor,
					issueConversionFactor: ium.issueConversionFactor
				}
			: null
	);

	$effect(() => {
		const qty = initialIssueQtyPurchase.trim();
		if (!qty || !ium || batchAllocations.length === 0) return;
		const hasAny = batchAllocations.some(
			(a) => Number(a.qtyPurchase) > 0
		);
		if (hasAny) return;
		batchAllocations = syncMedOrderFefoAllocations({
			batchAllocations,
			issueQtyPurchase: qty,
			ium
		});
	});

	let saving = $state(false);

	async function handleSave() {
		if (!iumFactors || !ium) {
			toast.addToast(
				m.med_order_inventory_invalid(),
				StatusColorEnum.ERROR
			);
			return;
		}
		let hasPositive = false;
		const {
			purchaseConversionFactor: pf,
			issueConversionFactor: iff
		} = iumFactors;
		for (const a of batchAllocations) {
			const qp = a.qtyPurchase.trim();
			if (!qp) continue;
			const n = Number(qp);
			if (!Number.isFinite(n) || n <= 0) {
				toast.addToast(
					m.inv_common_quantity(),
					StatusColorEnum.ERROR
				);
				return;
			}
			hasPositive = true;
			const need = purchaseQtyToIssueQtyNumber(qp, pf, iff);
			const avail = Number(a.stockIssueQty);
			if (need == null || need > avail + 1e-6) {
				toast.addToast(
					m.inv_dc_batch_qty_exceeds_stock(),
					StatusColorEnum.ERROR
				);
				return;
			}
		}
		if (!hasPositive) {
			toast.addToast(m.inv_common_quantity(), StatusColorEnum.ERROR);
			return;
		}
		saving = true;
		try {
			const merged = batchAllocations.map((a) => ({ ...a }));
			const total = sumAllocationPurchaseQty(merged);
			confirm({
				batchAllocations: merged,
				issueQtyPurchase: total
			} satisfies MedOrderBatchAllocDialogResult);
		} finally {
			saving = false;
		}
	}
</script>

<div class="mt-2 flex flex-col gap-3">
	{#if itemLabel}
		<p class="text-sm font-medium">{itemLabel}</p>
	{/if}
	<p class="text-xs opacity-70">{m.med_order_batch_pick_help()}</p>
	{#if batchAllocations.length > 0 && iumFactors}
		<InventoryBatchQtyPickTable
			bind:allocations={batchAllocations}
			factors={iumFactors}
			purchaseUnitLabel={ium?.purchaseUnitName ?? ''}
			issueUnitLabel={ium?.issueUnitName ?? ''}
			{disabled}
			showSalePrice={false}
		/>
	{:else}
		<p class="text-sm opacity-60">{m.med_order_inventory_invalid()}</p>
	{/if}
</div>

<div class="d-modal-action mt-6">
	<DaisyUiButton
		type="button"
		className="d-btn"
		disabled={saving}
		onClick={() => cancel()}
	>
		{m.cancel()}
	</DaisyUiButton>
	<DaisyUiButton
		type="button"
		className="d-btn d-btn-primary"
		disabled={saving || disabled || batchAllocations.length === 0}
		onClick={() => void handleSave()}
	>
		{m.ok()}
	</DaisyUiButton>
</div>
