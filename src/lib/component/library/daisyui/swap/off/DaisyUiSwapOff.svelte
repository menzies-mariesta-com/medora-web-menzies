<script lang="ts">
	let {  className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-swap-off {className}">
    {@render children()}
</div>
