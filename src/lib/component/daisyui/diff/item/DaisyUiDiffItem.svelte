<script lang="ts">
	let { itemNo, className, children } = $props<{
		itemNo: 1 | 2;
		className?: string;
		children: () => void;
	}>();
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="d-diff-item-{itemNo} {className}"
	role="img"
	tabindex={itemNo == 1 ? 0 : 1}
>
	{@render children()}
</div>
