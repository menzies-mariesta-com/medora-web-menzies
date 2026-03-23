<script lang="ts">
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';

	let {
		title,
		text = '',
		emptyMessage = '—',
		onAdd,
		cardClassName = ''
	} = $props<{
		title: string;
		text?: string | null;
		emptyMessage?: string;
		onAdd: () => void;
		cardClassName?: string;
	}>();

	const display = $derived(
		text != null && String(text).trim() !== ''
			? String(text).trim()
			: emptyMessage
	);
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
					onClick={onAdd}
				>
					<LucidePlus className="size-3.5" />
				</DaisyUiButton>
			</DaisyUiTooltip>
		</DaisyUiCardBodyTitle>
		<div
			class="observation-text-preview text-sm leading-snug whitespace-pre-wrap text-base-content/90 max-h-48 overflow-y-auto"
		>
			{display}
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>
