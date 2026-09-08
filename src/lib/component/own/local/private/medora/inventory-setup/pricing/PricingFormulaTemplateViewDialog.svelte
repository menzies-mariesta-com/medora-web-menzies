<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import PricingFormulaDisplay from '$lib/component/own/local/private/medora/inventory-setup/pricing/PricingFormulaDisplay.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type { PricingFormulaTemplateListRow } from '$lib/model/type/medora/pricing-formula-template.type';
	import { m } from '$lib/paraglide/messages';

	let {
		cancel,
		row
	}: DialogSlotProps & { row: PricingFormulaTemplateListRow } = $props();
</script>

<div class="flex flex-col gap-3 text-sm">
	<p>
		<span class="font-medium">{m.inv_pricing_template_name()}:</span>
		{row.name}
	</p>
	{#if row.description?.trim()}
		<p>
			<span class="font-medium">{m.remark()}:</span>
			{row.description}
		</p>
	{/if}
	<p>
		<span class="font-medium">{m.inv_pricing_config_msl_markup()}:</span>
		{row.mslMarkupPercent}%
	</p>
	<p>
		<span class="font-medium">{m.inv_pricing_template_assigned_count()}:</span>
		{row.assignmentCount}
	</p>
	<div>
		<p class="mb-2 font-medium">{m.inv_pricing_template_formula()}</p>
		<PricingFormulaDisplay
			input={{
				includeDiscount: row.includeDiscount,
				includeTax: row.includeTax,
				includeFreeQty: row.includeFreeQty,
				includeItemMarkup: row.includeItemMarkup,
				includeStoreMarkup: row.includeStoreMarkup,
				mslMarkupPercent: row.mslMarkupPercent
			}}
		/>
	</div>
	<div class="flex justify-end pt-2">
		<WashButton type="button" className="btn-ghost" onClick={() => cancel()}>
			{m.cancel()}
		</WashButton>
	</div>
</div>
