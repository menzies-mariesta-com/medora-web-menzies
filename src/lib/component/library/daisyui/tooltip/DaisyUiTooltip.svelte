<script lang="ts">
	let { children, tooltipText, className } = $props<{
		children: () => void;
		tooltipText: string;

		className?: string;
	}>();
</script>

<div class="d-tooltip {className} z-25" data-tip={tooltipText}>
	{@render children()}
</div>