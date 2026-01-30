<script lang="ts">
	let { className, children } = $props<{
		className?: string;
        children: () => void;
	}>();
</script>

<div class="d-skeleton {className}">
    {@render children()}
</div>