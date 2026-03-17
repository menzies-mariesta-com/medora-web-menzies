<script lang="ts">
	import { page } from '$app/state';
	import GPublicOnboardingFooterBar from '$lib/component/global/public/onboarding/GPublicOnboardingFooterBar.svelte';
	import GPublicOnboardingNavbar from '$lib/component/global/public/onboarding/GPublicOnboardingNavbar.svelte';
	import AnimatedPageContent from '$lib/component/library/gsap/AnimatedPageContent.svelte';

	let { children } = $props();
</script>

<div class="my-web">
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
