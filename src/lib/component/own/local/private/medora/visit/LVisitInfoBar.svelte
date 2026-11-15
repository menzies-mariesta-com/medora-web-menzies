<script lang="ts">
	import LVisitInfoDisplay from './LVisitInfoDisplay.svelte';
	import LChooseVisitButton from './LChooseVisitButton.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import type { EmrVisitListScope } from '$lib/model/type/medora/emr/visit-list.type';
	import type { VisitBarColorHints } from '$lib/model/type/medora/color-configuration.type';
	import { borderLeftStyleFromColor, triageRibbonStyle } from '$lib/tool/color/hospital-color-resolve.util';
	import { DAISYUI_DEFAULT_HEX } from '$lib/tool/color/color-daisyui-default.util';

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

	let colorHints = $state<VisitBarColorHints | null>(null);

	const barBorderStyle = $derived(
		colorHints?.visitTypeBorderColor
			? borderLeftStyleFromColor(colorHints.visitTypeBorderColor)
			: borderLeftStyleFromColor(DAISYUI_DEFAULT_HEX.primary)
	);

	function handleColorHints(hints: VisitBarColorHints | null) {
		colorHints = hints;
	}
</script>

<div
	class="relative mb-1.5 flex items-center justify-between gap-2 overflow-hidden rounded-box border-l-4 border-base-300 bg-base-200 px-3 py-1.5 shadow-sm {className}"
	style={barBorderStyle}
>
	{#if colorHints?.edTriageRibbonColor}
		<span
			class="pointer-events-none absolute -right-1 top-0 z-10 h-14 w-3 rounded-sm shadow-sm"
			style={triageRibbonStyle(colorHints.edTriageRibbonColor)}
			title={colorHints.edTriageLevelName ?? 'Triage level'}
			aria-hidden="true"
		></span>
	{/if}
	<div class="flex min-w-0 flex-1 flex-col">
		<LVisitInfoDisplay
			{visitId}
			{hospitalId}
			onColorHints={handleColorHints}
		/>
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
