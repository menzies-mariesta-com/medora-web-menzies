<script lang="ts">
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideTriangleAlert from '$lib/component/own/library/lucide/LucideTriangleAlert.svelte';
	import SvgRepoAllergyAlert from '$lib/component/own/library/svgrepo/SvgRepoAllergyAlert.svelte';

	let { hasVitalAlert, hasAllergyAlert } = $props<{
		hasVitalAlert: boolean;
		hasAllergyAlert: boolean;
	}>();
</script>

{#if hasVitalAlert || hasAllergyAlert}
	<div class="flex items-center justify-center gap-1">
		{#if hasVitalAlert}
			<DaisyUiTooltip
				tooltipText="Abnormal vital signs"
				className=""
			>
				<LucideTriangleAlert className="size-8 text-warning" />
			</DaisyUiTooltip>
		{/if}
		{#if hasAllergyAlert}
			<DaisyUiTooltip
				tooltipText="Allergy alert"
				className=""
			>
				<SvgRepoAllergyAlert className="size-8 text-error" />
			</DaisyUiTooltip>
		{/if}
	</div>
{/if}
