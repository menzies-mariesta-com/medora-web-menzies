<script lang="ts">
	import { page } from '$app/state';
	import GPrivateMedoraFooterBar from '$lib/component/own/global/private/medora/GPrivateMedoraFooterBar.svelte';
	import GPrivateMedoraNavbarOnly from '$lib/component/own/global/private/medora/GPrivateMedoraNavbarOnly.svelte';
	import AnimatedPageContent from '$lib/component/own/library/gsap/AnimatedPageContent.svelte';
	import { paraglideMsg } from '$lib/util/paraglide-fallback.util';

	let { children, data } = $props();

	const currentStaffId = $derived(data?.staff?.id ?? null);
	const currentStaffPhotoUrl = $derived(
		(data?.staff as { photoUrl?: string | null } | null)?.photoUrl ??
			null
	);
</script>

<div class="my-app">
	<GPrivateMedoraNavbarOnly
		title={paraglideMsg('ecosystem_page_title', 'Menzies ecosystem')}
		staffId={currentStaffId}
		staffPhotoUrl={currentStaffPhotoUrl}
	/>
	<div class="my-main p-3">
		{#key page.url.pathname}
			<AnimatedPageContent>
				{@render children?.()}
			</AnimatedPageContent>
		{/key}
	</div>
	<GPrivateMedoraFooterBar />
</div>
