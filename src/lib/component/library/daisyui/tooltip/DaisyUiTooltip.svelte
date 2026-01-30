<script lang="ts">
	let { children, tooltipText, className } = $props<{
		children: () => void;
		tooltipText: string;

		className?: string;
	}>();
</script>

<div class="d-tooltip {className}" data-tip={tooltipText}>
	{@render children()}
</div>