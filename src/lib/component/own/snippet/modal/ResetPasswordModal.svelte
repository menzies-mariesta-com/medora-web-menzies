<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import { authClient } from '$lib/auth/client';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const routerUtil = new RouterUtil();
	const msg = m as Record<string, (inputs?: Record<string, string>) => string>;

	let email = $state('');
	let isLoading = $state(false);

	async function handleConfirm() {
		const trimmed = email.trim();
		if (!trimmed) {
			toastService.addToast(m.please_enter_email(), StatusColorEnum.ERROR);
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
					error.message ?? m.failed_send_reset_link(),
					StatusColorEnum.ERROR
				);
				return;
			}

			toastService.addToast(m.reset_email_sent(), StatusColorEnum.INFO);
			await confirm({ email: trimmed });
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex items-start justify-between gap-3">
		<div>
			<h2 class="card-title text-primary text-lg font-bold">
				{msg.auth_forgot_title()}
			</h2>
			<p class="text-sm text-ink-muted">{msg.auth_forgot_subtitle()}</p>
		</div>
		<WashButton
			className="btn-ghost btn-sm btn-circle"
			onClick={() => cancel()}
			disabled={isLoading}
		>
			<LucideX className="size-5" />
		</WashButton>
	</div>

	<fieldset class="fieldset">
		<label class="label" for="modal-forgot-email">
			<span class="label-text">{m.email()}</span>
		</label>
		<WashInputField
			id="modal-forgot-email"
			inputType="email"
			inputPlaceholderText={m.email()}
			nameText="email"
			className="w-full"
			bind:value={email}
			disabled={isLoading}
			required
			ariaLabel={m.email()}
		/>
	</fieldset>

	<div class="card-actions flex-col gap-2 sm:flex-row sm:justify-end">
		<WashButton className="btn" onClick={() => cancel()} disabled={isLoading}>
			{m.cancel()}
		</WashButton>
		<WashButton
			onClick={() => handleConfirm()}
			className="btn btn-primary"
			disabled={isLoading}
			loading={isLoading}
			loadingText={m.sending()}
		>
			{m.send_reset_link()}
		</WashButton>
	</div>
</div>
