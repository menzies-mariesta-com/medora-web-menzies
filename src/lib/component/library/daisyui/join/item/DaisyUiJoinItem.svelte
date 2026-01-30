<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class=" d-join-item {className}">
	{@render children()}
</div>
