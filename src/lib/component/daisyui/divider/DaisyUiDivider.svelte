<script lang="ts">
	let { position, className, children } = $props<{
		position: 'horizontal' | 'vertical';
		className?: string;
		children?: () => void;
	}>();
</script>

<div class="d-divider d-divider-{position} {className}">
	{@render children?.()}
</div>
