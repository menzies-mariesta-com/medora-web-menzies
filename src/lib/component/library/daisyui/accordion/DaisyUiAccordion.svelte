<script lang="ts">
	let { items, groupName } = $props<{
		groupName: string;
		items: {
			title: string;
			content: string;
			titleClass?: string;
			contentClass?: string;
			icon?: 'arrow' | 'plus';
			className?: string;
			checked?: boolean;
		}[];
	}>();
</script>

<div class="d-join-vertical d-join bg-base-100">
	{#each items as { title, content, titleClass, contentClass, icon = 'arrow', className, checked }, i}
		<div
			class="d-collapse d-join-item border border-base-300 bg-base-100 {className}"
			class:d-collapse-arrow={icon === 'arrow'}
			class:d-collapse-plus={icon === 'plus'}
		>
			<input type="radio" name={groupName} {checked} />
			<div class={`d-collapse-title ${titleClass ?? ''}`}>
				{title}
			</div>
			<div class={`d-collapse-content ${contentClass ?? ''}`}>
				{content}
			</div>
		</div>
	{/each}
</div>
