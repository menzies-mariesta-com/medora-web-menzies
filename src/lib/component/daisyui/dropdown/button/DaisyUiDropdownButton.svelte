<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<summary class="d-btn {className}">
	{@render children()}
</summary>
