<script lang="ts">
	let { children } = $props();
</script>

<div class="my-app my-dotted-background-teal">
	<div class="my-main">
		{@render children?.()}
	</div>
</div>
