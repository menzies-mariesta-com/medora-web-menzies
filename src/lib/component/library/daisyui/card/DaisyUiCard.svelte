<script lang="ts">
	let { children, className } = $props<{
		children: () => void;
		className?: string;
	}>();
</script>

<div class="d-card bg-base-100 shadow-md {className}">
	{@render children()}
</div>
