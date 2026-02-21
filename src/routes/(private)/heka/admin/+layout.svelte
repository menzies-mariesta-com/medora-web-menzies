<script lang="ts">
	import { page } from '$app/state';
	import GPrivateHekaFooterBar from '$lib/component/global/private/heka/GPrivateHekaFooterBar.svelte';
	import GPrivateHekaNavbarOnly from '$lib/component/global/private/heka/GPrivateHekaNavbarOnly.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import LucideArrowLeft from '$lib/component/library/lucide/LucideArrowLeft.svelte';

	let { children, data } = $props();
	const routerUtil = new RouterUtil();
	const currentStaffId = $derived(data?.staff?.id ?? null);
	const currentStaffPhotoUrl = $derived(
		(data?.staff as { photoUrl?: string | null } | null)?.photoUrl ?? null
	);
</script>

<div class="my-app">
	<GPrivateHekaNavbarOnly
		title="System Admin"
		staffId={currentStaffId}
		staffPhotoUrl={currentStaffPhotoUrl}
	/>
	<div class="my-main p-3">
		<div class="mb-3">
			<DaisyUiButton
				className="d-btn-ghost d-btn-sm"
				onClick={() => routerUtil.goToRoute(WebRoutesEnum.HEKA_HOSPITAL)}
			>
				<LucideArrowLeft />
				Back to hospitals
			</DaisyUiButton>
		</div>
		{@render children?.()}
	</div>
	<GPrivateHekaFooterBar />
</div>
