<script lang="ts">
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { authClient } from '$lib/auth/client';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

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

	<div class="modal-action">
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
