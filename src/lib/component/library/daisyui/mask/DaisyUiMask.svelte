<script lang="ts">
	let { children, className } = $props<{
		children: () => void;
		className?: string;
	}>();
</script>

<ul class="d-mask {className}">
	{@render children()}
</ul>