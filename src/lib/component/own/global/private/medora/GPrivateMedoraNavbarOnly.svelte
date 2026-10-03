<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideUser from '$lib/component/own/library/lucide/LucideUser.svelte';
	import LucideCircleQuestionMark from '$lib/component/own/library/lucide/LucideCircleQuestionMark.svelte';
	import MedoraBrandWordmark from '$lib/component/own/global/MedoraBrandWordmark.svelte';
	import { getStaffPhotoDisplayUrl } from '$lib/util/staff-photo.util';
	import AccountModal from '$lib/component/own/snippet/modal/AccountModal.svelte';
	import MedoraNotifications from './MedoraNotifications.svelte';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';

	let {
		title = 'Hospitals',
		hospitalId = null,
		userEmail = null,
		staffId = null,
		staffPhotoUrl = null
	}: {
		title?: string;
		hospitalId?: string | null;
		userEmail?: string | null;
		staffId?: string | null;
		staffPhotoUrl?: string | null;
	} = $props();

	const profilePhotoDisplayUrl = $derived(
		getStaffPhotoDisplayUrl(staffPhotoUrl)
	);
	const hasProfilePhoto = $derived(!!profilePhotoDisplayUrl);
	const titleText = $derived(title?.trim() || 'Hospitals');
	const msg = m as Record<string, (inputs?: object) => string>;

	let accountModalOpen = $state(false);

	function openAccountModal() {
		accountModalOpen = true;
	}

	function closeAccountModal() {
		accountModalOpen = false;
	}
</script>

<div class="flex w-full flex-wrap items-center gap-2 border-b border-base-300/80 px-2 py-2">
	<div class="shrink-0">
		<MedoraBrandWordmark className="text-xl" />
	</div>
	<div
		class="flex min-w-0 flex-1 basis-[min(100%,16rem)] justify-center px-1"
	>
		<WashButton
			variant="primary"
			className="btn-outline pointer-events-none h-auto min-h-10 max-w-full whitespace-normal break-words text-center normal-case no-animation"
			title={titleText}
		>
			{titleText}
		</WashButton>
	</div>
	<div class="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-3">
		<WashTooltip
			tooltipText="Notification"
			className="overflow-visible z-10"
		>
			<MedoraNotifications />
		</WashTooltip>
		<WashTooltip
			tooltipText={msg.nav_help()}
			className="tooltip-primary"
		>
			<a
				href={resolve(WebRoutesEnum.DOCS)}
				target="_blank"
				rel="noopener noreferrer"
				class="btn btn-circle btn-ghost cursor-pointer"
				aria-label={msg.nav_help()}
			>
				<LucideCircleQuestionMark className="size-6" />
			</a>
		</WashTooltip>
		<WashTooltip tooltipText="Account" className="">
			<WashButton
				className="btn-circle overflow-hidden p-0"
				onClick={openAccountModal}
			>
				{#if hasProfilePhoto}
					<img
						src={profilePhotoDisplayUrl}
						alt="Profile"
						class="size-full object-cover"
					/>
				{:else}
					<LucideUser />
				{/if}
			</WashButton>
		</WashTooltip>
	</div>
</div>
<AccountModal
	open={accountModalOpen}
	onClose={closeAccountModal}
	{hospitalId}
	{userEmail}
	{staffId}
/>
