<script lang="ts">
	import GPublicOnboardingFooterBar from '$lib/component/global/public/onboarding/GPublicOnboardingFooterBar.svelte';
	import GPublicOnboardingNavbar from '$lib/component/global/public/onboarding/GPublicOnboardingNavbar.svelte';

	let { children } = $props();
</script>

<div class="my-web">
	<GPublicOnboardingNavbar />
	<div class="my-main">
		{@render children?.()}
	</div>
	<GPublicOnboardingFooterBar />
</div>
