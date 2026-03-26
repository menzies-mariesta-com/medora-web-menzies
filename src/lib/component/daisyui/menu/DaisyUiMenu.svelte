<script lang="ts">
	let { children, className } = $props<{
		children: () => void;
		className?: string;
	}>();
</script>

<ul class="d-menu rounded-box {className}">
	{@render children()}
</ul>
