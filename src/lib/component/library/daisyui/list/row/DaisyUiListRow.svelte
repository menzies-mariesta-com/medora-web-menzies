<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<li class="d-list-row {className}">
    {@render children()}
</li>