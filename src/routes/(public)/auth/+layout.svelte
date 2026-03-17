<script lang="ts">
	import AnimatedPageContent from '$lib/component/library/gsap/AnimatedPageContent.svelte';

	let { children } = $props();
</script>

<div class="my-dotted-background-teal">
	<div class="my-main">
		<AnimatedPageContent type="fadeUp">
			{@render children?.()}
		</AnimatedPageContent>
	</div>
</div>
