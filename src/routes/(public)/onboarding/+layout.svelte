<script lang="ts">
	import { page } from '$app/state';
	import GPublicOnboardingFooterBar from '$lib/component/own/global/public/onboarding/GPublicOnboardingFooterBar.svelte';
	import GPublicOnboardingNavbar from '$lib/component/own/global/public/onboarding/GPublicOnboardingNavbar.svelte';
	import AnimatedPageContent from '$lib/component/own/library/gsap/AnimatedPageContent.svelte';
	import { m } from '$lib/paraglide/messages';

	let { children } = $props();
</script>

<!-- Onboarding / marketplace shells: noindex (often thin or empty). -->
<svelte:head>
	<meta name="robots" content="noindex, nofollow" />
	<title>{m.menzies_medora()}</title>
</svelte:head>

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
