<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<p class="d-validator-hint -mb-3 {className}">
	{@render children?.()}
</p>
