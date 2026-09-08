<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<summary class="btn {className}">
	{@render children()}
</summary>
