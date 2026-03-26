<script lang="ts">
	import AnimatedPageContent from '$lib/component/own/library/gsap/AnimatedPageContent.svelte';

	let { children } = $props();
</script>

<div class="my-dotted-background-teal">
	<!-- Animated gradient layers (theme-aware: DaisyUI current primary/secondary/accent). -->
	<div class="my-auth-bg my-auth-bg--1" aria-hidden="true"></div>
	<div class="my-auth-bg my-auth-bg--2" aria-hidden="true"></div>
	<div class="my-auth-bg my-auth-bg--3" aria-hidden="true"></div>

	<!-- Optional starfield background (switchable via CSS classes). -->
	<!-- <div class="my-space-bg" aria-hidden="true">
		<div class="my-space-bg__stars"></div>
		<div class="my-space-bg__shooting-star"></div>
		<div class="my-space-bg__shooting-star"></div>
		<div class="my-space-bg__shooting-star"></div>
	</div> -->

	<div class="my-main">
		<AnimatedPageContent type="fadeUp">
			{@render children?.()}
		</AnimatedPageContent>
	</div>
</div>
