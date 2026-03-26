<script lang="ts">
	import { page } from '$app/state';
	import GPrivateHekaFooterBar from '$lib/component/own/global/private/heka/GPrivateHekaFooterBar.svelte';
	import GPrivateHekaNavbarOnly from '$lib/component/own/global/private/heka/GPrivateHekaNavbarOnly.svelte';
	import AnimatedPageContent from '$lib/component/own/library/gsap/AnimatedPageContent.svelte';
	import { m } from '$lib/paraglide/messages';

	let { children, data } = $props();

	/** True when we're inside a hospital's home (e.g. /heka/hospital/1/home or .../home/administration). Then the child layout provides its own navbar + footer; avoid duplicating here. */
	const isInsideHospitalHome = $derived(
		!!page.url.pathname.match(/^\/heka\/hospital\/[^/]+\/home(\/|$)/)
	);

	const currentStaffId = $derived(data?.staff?.id ?? null);
	const currentStaffPhotoUrl = $derived(
		(data?.staff as { photoUrl?: string | null } | null)?.photoUrl ??
			null
	);
</script>

{#if isInsideHospitalHome}
	{@render children?.()}
{:else}
	<div class="my-app">
		<GPrivateHekaNavbarOnly
			title={m.hospitals()}
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
		<GPrivateHekaFooterBar />
	</div>
{/if}
