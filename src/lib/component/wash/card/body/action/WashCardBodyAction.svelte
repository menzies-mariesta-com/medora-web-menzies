<script lang="ts">
	let { children, className } = $props<{
		children: () => void;
		className?: string;
	}>();
</script>

<div class="card-actions justify-end {className}">
	{@render children()}
</div>
