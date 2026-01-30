<script>
	import DaisyUiFab from '../library/daisyui/fab/DaisyUiFab.svelte';
	import DaisyUiTooltip from '../library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideGamepadDirectional from '../library/lucide/LucideGamepadDirectional.svelte';
	import LucideHand from '../library/lucide/LucideHand.svelte';
	import LucideLanguages from '../library/lucide/LucideLanguages.svelte';
	import LucidePalette from '../library/lucide/LucidePalette.svelte';
</script>

<DaisyUiFab>
	<DaisyUiTooltip
		tooltipText="Quick Tool"
		className="d-tooltip-left d-tooltip-secondary"
	>
		<div
			tabindex="0"
			role="button"
			class="d-btn d-btn-circle d-btn-lg d-btn-secondary"
		>
			<LucideHand />
		</div>
	</DaisyUiTooltip>

	<DaisyUiTooltip tooltipText="Navigate" className="d-tooltip-left ">
		<div
			tabindex="0"
			role="button"
			class="d-btn d-btn-circle d-btn-lg"
		>
			<LucideGamepadDirectional />
		</div>
	</DaisyUiTooltip>

	<DaisyUiTooltip tooltipText="Theme" className="d-tooltip-left ">
		<div
			tabindex="0"
			role="button"
			class="d-btn d-btn-circle d-btn-lg"
		>
			<LucidePalette />
		</div>
	</DaisyUiTooltip>

	<DaisyUiTooltip tooltipText="Languages" className="d-tooltip-left ">
		<div
			tabindex="0"
			role="button"
			class="d-btn d-btn-circle d-btn-lg"
		>
			<LucideLanguages />
		</div>
	</DaisyUiTooltip>
</DaisyUiFab>
