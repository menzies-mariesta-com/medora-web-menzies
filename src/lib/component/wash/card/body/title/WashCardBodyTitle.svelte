<script lang="ts">
	let { children, className } = $props<{
		children: () => void;
		className?: string;
	}>();
</script>

<div class="card-title {className}">
	{@render children()}
</div>
