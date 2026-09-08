<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class="collapse-content text-sm {className}">
	{@render children()}
</div>
