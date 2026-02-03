<script lang="ts">
	let { children } = $props();
</script>

<div class="my-dotted-background-teal">
	<div class="my-main">
		{@render children?.()}
	</div>
</div>
