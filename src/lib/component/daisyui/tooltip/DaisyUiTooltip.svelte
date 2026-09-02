<script lang="ts">
	let {
		children,
		tooltipText,
		className = ''
	} = $props<{
		children: () => void;
		tooltipText: string;
		className?: string;
	}>();
</script>

<div
	class="d-tooltip relative z-0 hover:z-50 focus-within:z-50 {className}"
	data-tip={tooltipText}
>
	{@render children()}
</div>
