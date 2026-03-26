<script lang="ts">
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';

	let {
		title,
		message,
		onAdd,
		cardClassName = '',
		addDisabled = false
	} = $props<{
		title: string;
		message: string;
		onAdd: () => void;
		cardClassName?: string;
		addDisabled?: boolean;
	}>();
</script>

<DaisyUiCard
	className={`observation-bento-card${cardClassName ? ` ${cardClassName}` : ''}`}
>
	<DaisyUiCardBody className="gap-3 p-4">
		<DaisyUiCardBodyTitle
			className="flex items-center justify-between"
		>
			<span class="text-sm font-semibold">{title}</span>
			<DaisyUiTooltip tooltipText="Add" className="d-tooltip-bottom">
				<DaisyUiButton
					className="d-btn-ghost d-btn-xs d-btn-square"
					disabled={addDisabled}
					onClick={onAdd}
				>
					<LucidePlus className="size-3.5" />
				</DaisyUiButton>
			</DaisyUiTooltip>
		</DaisyUiCardBodyTitle>
		<p class="text-sm text-base-content/70">{message}</p>
	</DaisyUiCardBody>
</DaisyUiCard>
