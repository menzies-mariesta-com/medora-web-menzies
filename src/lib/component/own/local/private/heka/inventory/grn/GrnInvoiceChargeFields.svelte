<script lang="ts">
	import GrnFormFieldRow from '$lib/component/own/local/private/heka/inventory/grn/GrnFormFieldRow.svelte';
	import { m } from '$lib/paraglide/messages';

	let {
		draft
	}: {
		draft: {
			invoiceDiscountAmount: string;
			invoiceDiscountPercent: string;
			invoiceTaxAmount: string;
			invoiceTaxPercent: string;
		};
	} = $props();

	let discountMode = $state<'percent' | 'amount'>(
		Number(draft.invoiceDiscountAmount) > 0 ? 'amount' : 'percent'
	);
	let taxMode = $state<'percent' | 'amount'>(
		Number(draft.invoiceTaxAmount) > 0 ? 'amount' : 'percent'
	);

	function setDiscountMode(next: 'percent' | 'amount') {
		discountMode = next;
		if (next === 'percent') draft.invoiceDiscountAmount = '0';
		else draft.invoiceDiscountPercent = '0';
	}

	function setTaxMode(next: 'percent' | 'amount') {
		taxMode = next;
		if (next === 'percent') draft.invoiceTaxAmount = '0';
		else draft.invoiceTaxPercent = '0';
	}
</script>

<div class="flex flex-col gap-4">
	<GrnFormFieldRow
		label={discountMode === 'amount'
			? m.inv_grn_invoice_discount_amount()
			: m.inv_grn_invoice_discount_percent()}
	>
		<div class="flex items-center gap-3">
			<div class="min-w-0 flex-1">
				{#if discountMode === 'amount'}
					<input
						type="number"
						class="d-input-bordered d-input w-full"
						value={draft.invoiceDiscountAmount === '' ||
						draft.invoiceDiscountAmount === '0'
							? ''
							: String(draft.invoiceDiscountAmount)}
						oninput={(e) => {
							draft.invoiceDiscountAmount = e.currentTarget.value;
						}}
						step="0.01"
						min="0"
						aria-label={m.inv_grn_invoice_discount_amount()}
					/>
				{:else}
					<input
						type="number"
						class="d-input-bordered d-input w-full"
						value={draft.invoiceDiscountPercent === '' ||
						draft.invoiceDiscountPercent === '0'
							? ''
							: String(draft.invoiceDiscountPercent)}
						oninput={(e) => {
							draft.invoiceDiscountPercent = e.currentTarget.value;
						}}
						step="0.01"
						min="0"
						aria-label={m.inv_grn_invoice_discount_percent()}
					/>
				{/if}
			</div>
			<label class="flex shrink-0 items-center gap-2 text-xs opacity-80">
				<span>%</span>
				<input
					type="checkbox"
					class="d-toggle d-toggle-accent"
					checked={discountMode === 'amount'}
					aria-label="Toggle invoice discount percent/amount"
					onchange={(e) => {
						const checked = (e.currentTarget as HTMLInputElement).checked;
						setDiscountMode(checked ? 'amount' : 'percent');
					}}
				/>
				<span>$</span>
			</label>
		</div>
	</GrnFormFieldRow>

	<GrnFormFieldRow
		label={taxMode === 'amount'
			? m.inv_grn_invoice_tax_amount()
			: m.inv_grn_invoice_tax_percent()}
	>
		<div class="flex items-center gap-3">
			<div class="min-w-0 flex-1">
				{#if taxMode === 'amount'}
					<input
						type="number"
						class="d-input-bordered d-input w-full"
						value={draft.invoiceTaxAmount === '' ||
						draft.invoiceTaxAmount === '0'
							? ''
							: String(draft.invoiceTaxAmount)}
						oninput={(e) => {
							draft.invoiceTaxAmount = e.currentTarget.value;
						}}
						step="0.01"
						min="0"
						aria-label={m.inv_grn_invoice_tax_amount()}
					/>
				{:else}
					<input
						type="number"
						class="d-input-bordered d-input w-full"
						value={draft.invoiceTaxPercent === '' ||
						draft.invoiceTaxPercent === '0'
							? ''
							: String(draft.invoiceTaxPercent)}
						oninput={(e) => {
							draft.invoiceTaxPercent = e.currentTarget.value;
						}}
						step="0.01"
						min="0"
						aria-label={m.inv_grn_invoice_tax_percent()}
					/>
				{/if}
			</div>
			<label class="flex shrink-0 items-center gap-2 text-xs opacity-80">
				<span>%</span>
				<input
					type="checkbox"
					class="d-toggle d-toggle-primary"
					checked={taxMode === 'amount'}
					aria-label="Toggle invoice tax percent/amount"
					onchange={(e) => {
						const checked = (e.currentTarget as HTMLInputElement).checked;
						setTaxMode(checked ? 'amount' : 'percent');
					}}
				/>
				<span>$</span>
			</label>
		</div>
	</GrnFormFieldRow>
</div>
