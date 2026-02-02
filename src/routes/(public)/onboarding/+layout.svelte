<script lang="ts">
	let { children } = $props();
</script>

<div class="my-web">
	<div class="my-main">
		{@render children?.()}
	</div>
</div>
