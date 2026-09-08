<script lang="ts">
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';

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

<WashCard
	className={`observation-bento-card${cardClassName ? ` ${cardClassName}` : ''}`}
>
	<WashCardBody className="gap-3 p-4">
		<WashCardBodyTitle
			className="flex items-center justify-between"
		>
			<span class="text-sm font-semibold">{title}</span>
			<WashTooltip tooltipText="Add" className="">
				<WashButton
					className="btn-ghost btn-xs btn-square"
					onClick={onAdd}
				>
					<LucidePlus className="size-3.5" />
				</WashButton>
			</WashTooltip>
		</WashCardBodyTitle>
		<div
			class="observation-text-preview max-h-48 overflow-y-auto text-sm leading-snug whitespace-pre-wrap text-base-content/90"
		>
			{display}
		</div>
	</WashCardBody>
</WashCard>
