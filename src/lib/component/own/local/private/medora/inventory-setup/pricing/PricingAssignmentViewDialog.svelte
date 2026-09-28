<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type { InvPricingModuleCode } from '$lib/model/type/medora/inv-pricing-module.type';
	import type { ModulePricingAssignmentOverviewRow } from '$lib/model/type/medora/pricing-formula-template.type';
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

<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
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
	</div>
</div>
<WashDialogFooter>
	<WashButton type="button" className="btn-ghost" onClick={() => cancel()}>
		{m.cancel()}
	</WashButton>
</WashDialogFooter>
