<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import { authClient } from '$lib/auth/client';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { RouterUtil } from '$lib/util/router.util.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	let email = $state('');
	let isLoading = $state(false);

	async function handleConfirm() {
		const trimmed = email.trim();
		if (!trimmed) {
			toastService.addToast('Please enter your email.', StatusColorEnum.ERROR);
			return;
		}
		isLoading = true;
		const { error } = await authClient.requestPasswordReset({
			email: trimmed,
			redirectTo: routerUtil.getResetRedirectUrl(),
		});
		isLoading = false;

		if (error) {
			toastService.addToast(
				error.message ?? 'Failed to send reset link.',
				StatusColorEnum.ERROR
			);
			return;
		}
		toastService.addToast(
			'If an account exists for this email, a password reset link has been sent.',
			StatusColorEnum.INFO
		);
		confirm({ email: trimmed });
	}
</script>

<input
	type="email"
	class="d-input w-full"
	placeholder="Email"
	name="email"
	bind:value={email}
	disabled={isLoading}
	required
	aria-label="Email"
/>

<div class="d-modal-action">
	<DaisyUiButton className="d-btn" onClick={() => cancel()} disabled={isLoading}>
		Cancel
	</DaisyUiButton>
	<DaisyUiButton
		onClick={() => handleConfirm()}
		className="d-btn d-btn-primary"
		disabled={isLoading}
	>
		{isLoading ? 'Sending…' : 'Apply'}
	</DaisyUiButton>
</div>
