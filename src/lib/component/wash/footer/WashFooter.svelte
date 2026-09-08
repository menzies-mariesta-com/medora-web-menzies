<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<footer class="footer {className}">
	{@render children()}
</footer>
