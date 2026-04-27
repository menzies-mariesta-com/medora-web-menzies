<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { authClient } from '$lib/auth/client';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	let { confirm, cancel }: DialogSlotProps = $props();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	let name = $state('');
	let email = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		const n = name.trim();
		const em = email.trim();
		if (!n) {
			toastService.addToast(
				'Name is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!em) {
			toastService.addToast(
				'Email is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		isSubmitting = true;
		try {
			const res = await fetch('/api/heka/auth/user', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ name: n, email: em })
			});
			if (!res.ok) {
				const t = await res.text().catch(() => '');
				throw new Error(t || `Create failed: ${res.status}`);
			}
			toastSuccess(
				toastService,
				m.entity_owner(),
				m.toast_action_created()
			);

			const { error } = await authClient.requestPasswordReset({
				email: em,
				redirectTo: routerUtil.getResetRedirectUrl()
			});
			if (error) {
				toastService.addToast(
					error.message ?? 'Failed to send reset password email.',
					StatusColorEnum.ERROR
				);
			} else {
				toastService.addToast(
					'Reset password email has been sent to the owner.',
					StatusColorEnum.INFO
				);
			}
			confirm();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : 'Create failed';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	<div class="flex flex-col gap-4">
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel
				forText="owner-name"
				className="shrink-0 sm:w-36 font-bold"
				>Name <span class="text-error">*</span></DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="owner-name"
					bind:value={name}
					inputType="text"
					inputPlaceholderText="Full name"
					required
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel
				forText="owner-email"
				className="shrink-0 sm:w-36 font-bold"
				>Email <span class="text-error">*</span></DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="owner-email"
					bind:value={email}
					inputType="email"
					inputPlaceholderText="email@example.com"
					required
				/>
			</div>
		</div>
		<p class="text-sm text-base-content/70">
			A reset password email will be sent to this address so the owner
			can set their password.
		</p>
	</div>
	<div
		class="d-modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4"
	>
		<DaisyUiButton
			type="button"
			className="d-btn-ghost"
			onClick={() => cancel()}
		>
			Cancel
		</DaisyUiButton>
		<DaisyUiButton
			type="submit"
			className="d-btn-primary"
			loading={isSubmitting}
		>
			Create
		</DaisyUiButton>
	</div>
</form>
