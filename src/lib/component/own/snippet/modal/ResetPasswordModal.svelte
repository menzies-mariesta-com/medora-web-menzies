<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
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
			toastService.addToast(
				'Please enter your email.',
				StatusColorEnum.ERROR
			);
			return;
		}
		isLoading = true;
		try {
			const { error } = await authClient.requestPasswordReset({
				email: trimmed,
				redirectTo: routerUtil.getResetRedirectUrl()
			});

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

			await confirm({ email: trimmed });
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex flex-col">
	<div
		class="flex items-center justify-between border-b border-base-300 pb-4"
	>
		<h2 class="text-lg font-semibold">Forgot password</h2>
		<DaisyUiButton
			className="d-btn-ghost d-btn-sm d-btn-circle"
			onClick={() => cancel()}
			disabled={isLoading}
		>
			<LucideX className="size-5" />
		</DaisyUiButton>
	</div>
	<div class="mt-4 flex flex-col gap-4">
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
			<DaisyUiButton
				className="d-btn"
				onClick={() => cancel()}
				disabled={isLoading}
			>
				Cancel
			</DaisyUiButton>
			<DaisyUiButton
				onClick={() => handleConfirm()}
				className="d-btn d-btn-primary"
				disabled={isLoading}
				loading={isLoading}
			>
				Apply
			</DaisyUiButton>
		</div>
	</div>
</div>
