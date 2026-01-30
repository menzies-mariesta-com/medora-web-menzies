<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<footer class="d-footer {className}">
	{@render children()}
</footer>
