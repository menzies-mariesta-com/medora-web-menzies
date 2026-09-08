<script lang="ts">
	import { page } from '$app/state';
	import GPublicOnboardingFooterBar from '$lib/component/own/global/public/onboarding/GPublicOnboardingFooterBar.svelte';
	import GPublicOnboardingNavbar from '$lib/component/own/global/public/onboarding/GPublicOnboardingNavbar.svelte';
	import AnimatedPageContent from '$lib/component/own/library/gsap/AnimatedPageContent.svelte';

	let { children } = $props();
</script>

<div class="my-web min-h-dvh">
	<GPublicOnboardingNavbar />
	<div class="my-main">
		{#key page.url.pathname}
			<AnimatedPageContent type="fadeUp">
				{@render children?.()}
			</AnimatedPageContent>
		{/key}
	</div>
	<GPublicOnboardingFooterBar />
</div>
