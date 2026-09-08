<script lang="ts">
	let { effect, className, children } = $props<{
		effect?: 'zebra';
		className?: string;
		children: () => void;
	}>();
</script>

<table
	class={`table ${effect ? `table-${effect}` : ''} ${className || ''}`}
>
	{@render children()}
</table>
