<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class="tabs-lift tabs {className}">
	{@render children?.()}
</div>
