<script lang="ts">
	import type { PricingFormulaDisplayInput } from '$lib/tool/inventory/pricing-formula-display.util';
	import { buildPricingFormulaDisplay } from '$lib/tool/inventory/pricing-formula-display.util';
	import { m } from '$lib/paraglide/messages';

	let {
		input,
		variant = 'block',
		className = ''
	}: {
		input: PricingFormulaDisplayInput;
		/** `block`: two lines; `inline`: one line; `price-only`: price step only */
		variant?: 'block' | 'inline' | 'price-only';
		className?: string;
	} = $props();

	const lines = $derived(
		buildPricingFormulaDisplay(input, {
			baseSubtotal: m.inv_pricing_config_formula_base_subtotal(),
			minusLineDiscount: m.inv_pricing_config_formula_minus_line_discount(),
			minusInvoiceDiscount:
				m.inv_pricing_config_formula_minus_invoice_discount(),
			plusLineTax: m.inv_pricing_config_formula_plus_line_tax(),
			plusInvoiceTax: m.inv_pricing_config_formula_plus_invoice_tax(),
			denomPurchased: m.inv_pricing_config_formula_denom_purchased(),
			denomPurchasedPlusFree:
				m.inv_pricing_config_formula_denom_purchased_plus_free(),
			costEquals: m.inv_pricing_template_formula_cost_equals(),
			priceEquals: m.inv_pricing_template_formula_price_equals(),
			timesMsl: (percent) =>
				m.inv_pricing_template_formula_times_msl({ percent }),
			timesItemMarkup: m.inv_pricing_template_formula_times_item_markup(),
			timesStoreMarkup: m.inv_pricing_template_formula_times_store_markup()
		})
	);
</script>

{#if variant === 'inline'}
	<p class="text-xs font-mono opacity-80 {className}">{lines.summaryLine}</p>
{:else if variant === 'price-only'}
	<p class="text-xs font-mono opacity-80 {className}">{lines.priceLine}</p>
{:else}
	<div class="flex flex-col gap-1 text-sm font-mono opacity-80 {className}">
		<p>{lines.costLine}</p>
		<p>{lines.priceLine}</p>
	</div>
{/if}
