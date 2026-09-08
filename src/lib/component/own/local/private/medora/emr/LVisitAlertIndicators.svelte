<script lang="ts">
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
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
			<WashTooltip
				tooltipText="Abnormal vital signs"
				className=""
			>
				<LucideTriangleAlert className="size-8 text-warning" />
			</WashTooltip>
		{/if}
		{#if hasAllergyAlert}
			<WashTooltip
				tooltipText="Allergy alert"
				className=""
			>
				<SvgRepoAllergyAlert className="size-8 text-error" />
			</WashTooltip>
		{/if}
	</div>
{/if}
