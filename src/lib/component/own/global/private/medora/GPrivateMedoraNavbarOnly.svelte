<script lang="ts">
	import { washRecipes } from '@menzies-mariesta-com/menzies-design-wash-ui/core';

	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideUser from '$lib/component/own/library/lucide/LucideUser.svelte';
	import MedoraBrandWordmark from '$lib/component/own/global/MedoraBrandWordmark.svelte';
	import { getStaffPhotoDisplayUrl } from '$lib/util/staff-photo.util';
	import AccountModal from '$lib/component/own/snippet/modal/AccountModal.svelte';
	import MedoraNotifications from './MedoraNotifications.svelte';

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

	let accountModalOpen = $state(false);

	function openAccountModal() {
		accountModalOpen = true;
	}

	function closeAccountModal() {
		accountModalOpen = false;
	}
</script>

<div class="{washRecipes.navbar} border-b border-base-300/80">
	<div class="navbar-start gap-3">
		<MedoraBrandWordmark className="text-xl" />
	</div>
	<div class="navbar-center min-w-0 max-w-[min(100%,24rem)] flex-1 px-2">
		<WashInputField
			inputType="text"
			value={title}
			disabled
			className="btn-primary w-full max-w-96 text-center"
		/>
	</div>
	<div class="navbar-end gap-3">
		<WashTooltip
			tooltipText="Notification"
			className=""
		>
			<MedoraNotifications />
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
