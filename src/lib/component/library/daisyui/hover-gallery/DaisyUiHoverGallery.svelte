<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children?: () => {};
	}>();
</script>

<figure class="d-hover-gallery {className}">
	{@render children?.()}
</figure>
