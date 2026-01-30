<script lang="ts">
	let { children, className } = $props<{
		children: () => void;
		className?: string;
	}>();
</script>

<div class="d-card-title {className}">
	{@render children()}
</div>