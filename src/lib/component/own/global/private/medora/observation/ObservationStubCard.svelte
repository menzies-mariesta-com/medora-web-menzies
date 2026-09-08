<script lang="ts">
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
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
					disabled={addDisabled}
					onClick={onAdd}
				>
					<LucidePlus className="size-3.5" />
				</WashButton>
			</WashTooltip>
		</WashCardBodyTitle>
		<p class="text-sm text-base-content/70">{message}</p>
	</WashCardBody>
</WashCard>
