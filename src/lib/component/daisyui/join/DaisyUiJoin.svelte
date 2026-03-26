<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-join flex {className}">
	{@render children()}
</div>
