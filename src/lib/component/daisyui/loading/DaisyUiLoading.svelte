<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children?: (() => void) | null | undefined;
	}>();
</script>

<span class="d-loading d-loading-spinner {className}">
	{@render children?.()}
</span>
