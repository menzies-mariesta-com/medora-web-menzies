<script lang="ts">
	let { id, children, className } = $props<{
        id: string;
		className?: string;
		children: () => void;
	}>();
</script>

<div id={id} class="d-carousel-item {className}">
	{@render children()}
</div>