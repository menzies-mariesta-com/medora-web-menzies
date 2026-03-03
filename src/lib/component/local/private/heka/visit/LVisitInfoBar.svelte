<script lang="ts">
	import LVisitInfoDisplay from './LVisitInfoDisplay.svelte';
	import LChooseVisitButton from './LChooseVisitButton.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideX from '$lib/component/library/lucide/LucideX.svelte';

	let {
		visitId = '',
		hospitalId,
		onVisitSelected,
		onVisitReset,
		className = ''
	} = $props<{
		visitId?: string;
		hospitalId: string | undefined;
		onVisitSelected: (data: { visitId: number; patientName: string }) => void;
		onVisitReset: () => void;
		className?: string;
	}>();

	const hasVisit = $derived(!!visitId);
</script>

<div
	class="flex items-center justify-between gap-4 rounded-box border-l-4 border-primary bg-base-200 p-4 shadow-sm mb-2 {className}"
>
	<div class="flex min-w-0 flex-1 flex-col gap-0.5">
		<LVisitInfoDisplay {visitId} />
	</div>
	<div class="flex shrink-0 items-center gap-2">
		{#if hasVisit}
			<DaisyUiTooltip tooltipText="Reset selected visit" className="d-tooltip-bottom">
				<DaisyUiButton
					className="d-btn-ghost d-btn-sm d-btn-circle"
					onClick={onVisitReset}
				>
					<LucideX className="size-5" />
				</DaisyUiButton>
			</DaisyUiTooltip>
		{/if}
		<LChooseVisitButton {hospitalId} {onVisitSelected} />
	</div>
</div>
