<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import InventoryBatchQtyPickTable from '$lib/component/own/local/private/medora/inventory/InventoryBatchQtyPickTable.svelte';
	import type { ConsumptionBatchAllocationDraft } from '$lib/model/type/medora/department-consumption-detail.type';
	import type { ConsumptionDraftLineIum } from '$lib/model/type/medora/department-consumption-detail.type';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import {
		sumAllocationPurchaseQty,
		syncMedOrderFefoAllocations,
		syncQtyOutFromAllocations
	} from '$lib/tool/medication-order/med-order-line-inventory.util';
	import { purchaseQtyToIssueQtyNumber } from '$lib/tool/inventory/purchase-issue-qty-convert.util';

	export type MedOrderBatchAllocDialogResult = {
		batchAllocations: ConsumptionBatchAllocationDraft[];
		qtyOut: string;
	};

	let {
		confirm,
		cancel,
		itemLabel,
		initialAllocations,
		initialQtyOut,
		outUnitId,
		ium,
		disabled = false
	}: DialogSlotProps & {
		itemLabel: string;
		initialAllocations: ConsumptionBatchAllocationDraft[];
		initialQtyOut: string;
		outUnitId: number;
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
		const qty = initialQtyOut.trim();
		if (!qty || !ium || batchAllocations.length === 0 || outUnitId <= 0) {
			return;
		}
		const hasAny = batchAllocations.some(
			(a) => Number(a.qtyPurchase) > 0
		);
		if (hasAny) return;
		batchAllocations = syncMedOrderFefoAllocations({
			batchAllocations,
			qtyOut: qty,
			outUnitId,
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
			const qtyOut =
				syncQtyOutFromAllocations(merged, outUnitId, ium) || total;
			confirm({
				batchAllocations: merged,
				qtyOut
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

<div class="modal-action mt-6">
	<WashButton
		type="button"
		className="btn"
		disabled={saving}
		onClick={() => cancel()}
	>
		{m.cancel()}
	</WashButton>
	<WashButton
		type="button"
		className="btn btn-primary"
		disabled={saving || disabled || batchAllocations.length === 0}
		onClick={() => void handleSave()}
	>
		{m.ok()}
	</WashButton>
</div>
