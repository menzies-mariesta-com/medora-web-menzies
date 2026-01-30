<script lang="ts">
	let { children, className } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-mockup-code {className}">
	{@render children()}
</div>
