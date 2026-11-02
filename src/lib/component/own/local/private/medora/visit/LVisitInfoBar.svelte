<script lang="ts">
	import LVisitInfoDisplay from './LVisitInfoDisplay.svelte';
	import LChooseVisitButton from './LChooseVisitButton.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import type { EmrVisitListScope } from '$lib/model/type/medora/emr/visit-list.type';

	let {
		visitId = '',
		hospitalId,
		onVisitSelected,
		onVisitReset,
		className = '',
		listScope = 'doctor' as EmrVisitListScope
	} = $props<{
		visitId?: string;
		hospitalId: string | undefined;
		onVisitSelected: (data: {
			visitId: string;
			patientName: string;
		}) => void;
		onVisitReset: () => void;
		className?: string;
		listScope?: EmrVisitListScope;
	}>();

	const hasVisit = $derived(!!visitId);
</script>

<div
	class="mb-1.5 flex items-center justify-between gap-2 rounded-box border-l-4 border-primary/50 bg-base-200 px-3 py-1.5 shadow-sm {className}"
>
	<div class="flex min-w-0 flex-1 flex-col">
		<LVisitInfoDisplay {visitId} {hospitalId} />
	</div>
	<div class="flex shrink-0 items-center gap-1.5">
		{#if hasVisit}
			<WashTooltip
				tooltipText="Reset selected visit"
				className=""
			>
				<WashButton
					className="btn-ghost btn-xs btn-circle"
					onClick={onVisitReset}
				>
					<LucideX className="size-3.5" />
				</WashButton>
			</WashTooltip>
		{/if}
		<LChooseVisitButton {hospitalId} {onVisitSelected} {listScope} />
	</div>
</div>
