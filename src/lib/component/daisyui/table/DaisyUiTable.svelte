<script lang="ts">
	let { effect, className, children } = $props<{
		effect?: 'zebra';
		className?: string;
		children: () => void;
	}>();
</script>

<table
	class={`d-table ${effect ? `d-table-${effect}` : ''} ${className || ''}`}
>
	{@render children()}
</table>
