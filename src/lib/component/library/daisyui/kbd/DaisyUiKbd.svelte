<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<kbd class="d-kbd {className}">{@render children()}</kbd>