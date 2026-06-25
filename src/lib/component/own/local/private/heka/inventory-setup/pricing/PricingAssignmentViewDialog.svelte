<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type { InvPricingModuleCode } from '$lib/model/type/heka/inv-pricing-module.type';
	import type { ModulePricingAssignmentOverviewRow } from '$lib/model/type/heka/pricing-formula-template.type';
	import { m } from '$lib/paraglide/messages';

	let {
		cancel,
		row,
		moduleLabel
	}: DialogSlotProps & {
		row: ModulePricingAssignmentOverviewRow;
		moduleLabel: (mod: InvPricingModuleCode) => string;
	} = $props();
</script>

<div class="flex flex-col gap-3 text-sm">
	<p>
		<span class="font-medium">{m.inv_pricing_config_branch()}:</span>
		{row.branchName}
	</p>
	<p>
		<span class="font-medium">{m.inv_pricing_assignment_module()}:</span>
		{moduleLabel(row.module)}
	</p>
	<p>
		<span class="font-medium">{m.inv_pricing_assignment_template()}:</span>
		{row.formulaTemplateName ?? m.inv_pricing_assignment_overview_unassigned()}
	</p>
	<div class="flex justify-end pt-2">
		<DaisyUiButton type="button" className="d-btn-ghost" onClick={() => cancel()}>
			{m.cancel()}
		</DaisyUiButton>
	</div>
</div>
