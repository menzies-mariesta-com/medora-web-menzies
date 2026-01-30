<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-tabs-lift d-tabs {className}">
	{@render children?.()}
</div>
