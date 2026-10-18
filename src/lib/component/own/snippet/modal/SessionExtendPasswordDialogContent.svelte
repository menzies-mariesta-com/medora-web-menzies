<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import LucideEye from '$lib/component/own/library/lucide/LucideEye.svelte';
	import LucideEyeOff from '$lib/component/own/library/lucide/LucideEyeOff.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { userFacingDetailFromResponse } from '$lib/util/user-facing-error.util';
const msg = m as Record<string, (inputs?: object) => string>;
	const toastService = new ToastService();

	export type SessionExtendDialogResult = {
		sessionExpiresAt: string;
	};

	let { confirm, cancel }: DialogSlotProps = $props();

	let password = $state('');
	let isPasswordVisible = $state(false);
	let isSubmitting = $state(false);

	function togglePasswordVisibility() {
		isPasswordVisible = !isPasswordVisible;
	}

	async function handleConfirm() {
		if (isSubmitting) return;
		const trimmed = password.trim();
		if (!trimmed) {
			toastService.addToast(
				msg.session_extend_password_required(),
				StatusColorEnum.ERROR
			);
			return;
		}

		isSubmitting = true;
		try {
			const res = await fetch('/api/session/extend', {
				method: 'POST',
				credentials: 'include',
				headers: {
					'content-type': 'application/json',
					'x-medora-ui-session-extend': '1'
				},
				body: JSON.stringify({ password: trimmed })
			});

			if (!res.ok) {
				const text = await userFacingDetailFromResponse(res).catch(() => '');
				if (res.status === 401) {
					toastService.addToast(
						msg.session_extend_password_invalid(),
						StatusColorEnum.ERROR
					);
					return;
				}
				if (res.status === 409) {
					toastService.addToast(
						msg.session_extend_already_extended(),
						StatusColorEnum.WARNING
					);
					cancel();
					return;
				}
				toastService.addToast(
					msg.session_extend_failed(),
					StatusColorEnum.ERROR,
					text || undefined
				);
				return;
			}

			const data = (await res.json()) as {
				sessionExpiresAt?: string;
			};
			if (!data.sessionExpiresAt) {
				toastService.addToast(
					msg.session_extend_failed(),
					StatusColorEnum.ERROR
				);
				return;
			}

			toastService.addToast(
				msg.session_extend_success(),
				StatusColorEnum.SUCCESS
			);
			await confirm({
				sessionExpiresAt: data.sessionExpiresAt
			} satisfies SessionExtendDialogResult);
		} catch (e) {
			toastService.addToast(
				msg.session_extend_failed(),
				StatusColorEnum.ERROR,
				e instanceof Error ? e.message : undefined
			);
		} finally {
			isSubmitting = false;
		}
	}

	function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		void handleConfirm();
	}
</script>

<form
	id="session-extend-password-form"
	class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
	onsubmit={onSubmit}
>
	<p class="text-sm text-base-content/80">
		{msg.session_extend_password_hint()}
	</p>
	<div class="flex flex-col gap-1">
		<label class="label" for="session-extend-password">
			<span class="label-text">
				{m.password()}<span
					class="align-top text-sm leading-none text-error"
					aria-hidden="true">*</span
				>
			</span>
		</label>
		<div class="join flex w-full">
			<WashInputField
				id="session-extend-password"
				inputType={isPasswordVisible ? 'text' : 'password'}
				inputPlaceholderText={m.password()}
				nameText="password"
				className="join-item w-full"
				bind:value={password}
				required
				disabled={isSubmitting}
			/>
			<div
				class="tooltip tooltip-left tooltip-secondary"
				data-tip={isPasswordVisible
					? msg.session_extend_hide_password()
					: msg.session_extend_show_password()}
			>
				<WashButton
					className="join-item cursor-pointer"
					type="button"
					variant="ghost"
					disabled={isSubmitting}
					onClick={togglePasswordVisibility}
					title={isPasswordVisible
						? msg.session_extend_hide_password()
						: msg.session_extend_show_password()}
				>
					{#if isPasswordVisible}
						<LucideEye className="size-4" />
					{:else}
						<LucideEyeOff className="size-4" />
					{/if}
				</WashButton>
			</div>
		</div>
	</div>
</form>

<WashDialogFooter>
	<WashButton
		type="button"
		variant="ghost"
		className="cursor-pointer"
		disabled={isSubmitting}
		onClick={cancel}
	>
		{m.cancel()}
	</WashButton>
	<WashButton
		type="submit"
		form="session-extend-password-form"
		variant="primary"
		className="cursor-pointer"
		disabled={isSubmitting || !password.trim()}
		loading={isSubmitting}
	>
		{msg.session_extend_confirm()}
	</WashButton>
</WashDialogFooter>
