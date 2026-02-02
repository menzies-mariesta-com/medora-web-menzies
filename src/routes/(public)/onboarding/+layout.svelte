<script lang="ts">
	import GPublicOnboardingFooterbar from '$lib/component/global/public/onboarding/GPublicOnboardingFooterbar.svelte';
	import GPublicOnboardingNavbar from '$lib/component/global/public/onboarding/GPublicOnboardingNavbar.svelte';

	let { children } = $props();
</script>

<div class="my-web">
	<GPublicOnboardingNavbar />
	<div class="my-main">
		{@render children?.()}
	</div>
	<GPublicOnboardingFooterbar />
</div>
