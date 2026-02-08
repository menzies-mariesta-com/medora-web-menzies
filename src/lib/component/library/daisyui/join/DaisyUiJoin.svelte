<script lang="ts">
	let { className, children } = $props<{
		className?: string;
		children: () => void;
	}>();
</script>

<div class="d-join !flex w-full min-w-0 {className}">
	{@render children()}
</div>
