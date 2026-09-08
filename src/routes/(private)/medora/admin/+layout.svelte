<script lang="ts">
	import { page } from '$app/state';
	import GPrivateMedoraFooterBar from '$lib/component/own/global/private/medora/GPrivateMedoraFooterBar.svelte';
	import GPrivateMedoraNavbarOnly from '$lib/component/own/global/private/medora/GPrivateMedoraNavbarOnly.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import AnimatedPageContent from '$lib/component/own/library/gsap/AnimatedPageContent.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import { m } from '$lib/paraglide/messages';

	let { children, data } = $props();
	const routerUtil = new RouterUtil();
	const currentStaffId = $derived(data?.staff?.id ?? null);
	const currentStaffPhotoUrl = $derived(
		(data?.staff as { photoUrl?: string | null } | null)?.photoUrl ??
			null
	);
</script>

<div class="my-app">
	<GPrivateMedoraNavbarOnly
		title={m.system_admin()}
		staffId={currentStaffId}
		staffPhotoUrl={currentStaffPhotoUrl}
	/>
	<div class="my-main p-3">
		{#key page.url.pathname}
			<AnimatedPageContent type="fadeUp">
				<div class="mb-3">
					<WashButton
						className="btn-ghost btn-sm"
						onClick={() =>
							routerUtil.goToRoute(WebRoutesEnum.MEDORA_HOSPITAL)}
					>
						<LucideArrowLeft />
						{m.back_to_hospitals()}
					</WashButton>
				</div>
				{@render children?.()}
			</AnimatedPageContent>
		{/key}
	</div>
	<GPrivateMedoraFooterBar />
</div>
