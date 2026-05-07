<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiNavbar from '$lib/component/daisyui/navbar/DaisyUiNavbar.svelte';
	import DaisyUiNavbarCenter from '$lib/component/daisyui/navbar/center/DaisyUiNavbarCenter.svelte';
	import DaisyUiNavbarEnd from '$lib/component/daisyui/navbar/end/DaisyUiNavbarEnd.svelte';
	import DaisyUiNavbarStart from '$lib/component/daisyui/navbar/start/DaisyUiNavbarStart.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideUser from '$lib/component/own/library/lucide/LucideUser.svelte';
	import HekaLogo from '$lib/asset/image/heka_logo.webp';
	import { getStaffPhotoDisplayUrl } from '$lib/util/staff-photo.util';
	import AccountModal from '$lib/component/own/snippet/modal/AccountModal.svelte';
	import HekaNotifications from './HekaNotifications.svelte';

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

<DaisyUiNavbar className="bg-base-100 flex">
	<DaisyUiNavbarStart className="gap-3">
		<img src={HekaLogo} alt="Heka Logo" class="w-20" />
	</DaisyUiNavbarStart>
	<DaisyUiNavbarCenter>
		<DaisyUiInputField
			inputType="text"
			value={title}
			disabled
			className="d-btn-primary w-96 text-center"
		/>
	</DaisyUiNavbarCenter>
	<DaisyUiNavbarEnd className="gap-3">
		<DaisyUiTooltip
			tooltipText="Notification"
			className="d-tooltip-left"
		>
			<HekaNotifications />
		</DaisyUiTooltip>
		<DaisyUiTooltip tooltipText="Account" className="d-tooltip-left">
			<DaisyUiButton
				className="d-btn-circle overflow-hidden p-0"
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
			</DaisyUiButton>
		</DaisyUiTooltip>
	</DaisyUiNavbarEnd>
</DaisyUiNavbar>
<AccountModal
	open={accountModalOpen}
	onClose={closeAccountModal}
	{hospitalId}
	{userEmail}
	{staffId}
/>
