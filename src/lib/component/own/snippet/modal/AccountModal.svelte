<script lang="ts">
	import DaisyUiModal from '$lib/component/daisyui/modal/DaisyUiModal.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import LucideLogOut from '$lib/component/own/library/lucide/LucideLogOut.svelte';
	import LucideUserCog from '$lib/component/own/library/lucide/LucideUserCog.svelte';
	import LucideUserX from '$lib/component/own/library/lucide/LucideUserX.svelte';
	import LucideArrowLeft from '$lib/component/own/library/lucide/LucideArrowLeft.svelte';
	import { authClient } from '$lib/auth/client';
	import { goto } from '$app/navigation';
	import { WebRoutesEnum } from '$lib/model/enum/routes.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	let { open, onClose, staffId, registrationEditUrl } = $props<{
		open: boolean;
		onClose: () => void;
		staffId: string | null;
		registrationEditUrl: string;
	}>();

	const toastService = new ToastService();

	type Screen = 'menu' | 'account-edit';
	let screen = $state<Screen>('menu');

	let showEditIframe = $derived(
		screen === 'account-edit' && !!staffId
	);
	const iframeSrc = $derived(
		staffId ? `${registrationEditUrl}?edit=${staffId}&embed=1` : ''
	);

	async function handleLogOut() {
		onClose();
		await authClient.signOut();
		goto(WebRoutesEnum.LOGIN);
	}

	function openAccountSetting() {
		if (staffId) {
			screen = 'account-edit';
		} else {
			toastService.addToast(
				'No staff profile linked to this account.',
				StatusColorEnum.ERROR
			);
		}
	}

	function backToMenu() {
		screen = 'menu';
	}

	async function handleDeactivate() {
		if (!staffId) {
			toastService.addToast(
				'No staff profile linked to this account.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const result = await dialogService.open({
			title: 'Deactivate account',
			message:
				'Are you sure you want to deactivate your account? You can contact an administrator to reactivate it.',
			variant: DialogVariantEnum.CONFIRM
		});
		if (result.confirmed) {
			try {
				const res = await fetch('/api/heka/staff/self', {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						staffId,
						statusId: StatusEnum.INACTIVE
					})
				});
				if (!res.ok) {
					const t = await res.text().catch(() => '');
					throw new Error(t || `Update failed: ${res.status}`);
				}
				toastSuccess(
					toastService,
					m.entity_account(),
					m.toast_action_inactivated()
				);
				onClose();
				await authClient.signOut();
				goto(WebRoutesEnum.LOGIN);
			} catch (err) {
				console.error(err);
				toastService.addToast(
					'Failed to deactivate account.',
					StatusColorEnum.ERROR
				);
			}
		}
	}

	function handleClose() {
		screen = 'menu';
		onClose();
	}
</script>

{#if open}
	<DaisyUiModal
		groupName="account-settings-modal"
		open={true}
		onClose={handleClose}
		className={showEditIframe
			? '!max-w-none !w-[100dvw] !h-[100dvh] !min-h-[100dvh]'
			: ''}
	>
		{#if showEditIframe}
			<div
				class="d-modal-box flex h-[96dvh] min-h-[96dvh] w-[96vw] !max-w-none flex-col gap-0 overflow-hidden p-0"
				role="document"
			>
				<div
					class="flex shrink-0 items-center justify-between border-b border-base-300 px-4 py-2"
				>
					<DaisyUiButton
						className="d-btn-ghost d-btn-sm gap-2"
						onClick={backToMenu}
					>
						<LucideArrowLeft className="size-5" />
						Back
					</DaisyUiButton>
					<h2 class="text-lg font-semibold">Account setting</h2>
					<DaisyUiButton
						className="d-btn-ghost d-btn-sm d-btn-circle"
						onClick={handleClose}
					>
						<LucideX className="size-5" />
					</DaisyUiButton>
				</div>
				<iframe
					title="Edit your profile"
					class="min-h-0 w-full flex-1 rounded-b-box border-0"
					src={iframeSrc}
				></iframe>
			</div>
		{:else}
			<div class="d-modal-box max-w-md" role="document">
				<div
					class="flex items-center justify-between border-b border-base-300 pb-4"
				>
					<h2 class="text-lg font-semibold">Account</h2>
					<DaisyUiButton
						className="d-btn-ghost d-btn-sm d-btn-circle"
						onClick={handleClose}
					>
						<LucideX className="size-5" />
					</DaisyUiButton>
				</div>
				<div class="mt-4 flex flex-col gap-2">
					<DaisyUiButton
						className="d-btn-ghost w-full justify-start gap-2"
						onClick={handleLogOut}
					>
						<LucideLogOut className="size-5" />
						Log out
					</DaisyUiButton>
					<DaisyUiButton
						className="d-btn-ghost w-full justify-start gap-2"
						onClick={openAccountSetting}
					>
						<LucideUserCog className="size-5" />
						Account setting
					</DaisyUiButton>
					<DaisyUiButton
						className="d-btn-ghost w-full justify-start gap-2 text-error"
						onClick={handleDeactivate}
					>
						<LucideUserX className="size-5" />
						Deactivate account
					</DaisyUiButton>
				</div>
			</div>
		{/if}
	</DaisyUiModal>
{/if}
