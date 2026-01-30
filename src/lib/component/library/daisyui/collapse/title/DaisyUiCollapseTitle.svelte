<script lang="ts">
	let {  className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-collapse-title font-semibold {className}">
    {@render children()}
</div>