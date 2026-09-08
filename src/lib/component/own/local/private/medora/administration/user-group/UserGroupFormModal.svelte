<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCheckbox from '$lib/component/wash/checkbox/WashCheckbox.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { UserGroupModalState } from '$lib/state/user-group-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();

	let formName = $state('');
	let formActive = $state(true);
	let isSubmitting = $state(false);

	const modalState = $derived(UserGroupModalState);
	const isEdit = $derived(
		modalState.mode === 'edit' && modalState.editGroup != null
	);

	$effect(() => {
		const s = UserGroupModalState;
		if (s.mode === 'edit' && s.editGroup) {
			formName = s.editGroup.name ?? '';
			formActive =
				(s.editGroup.statusId ?? StatusEnum.ACTIVE) ===
				StatusEnum.ACTIVE;
		} else {
			formName = '';
			formActive = true;
		}
	});

	function apiUrl(hospitalId: string): string {
		return `/api/medora/hospital/${hospitalId}/home/administration/user-group`;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting) return;
		if (!formName?.trim()) {
			toastService.addToast(
				'Name is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!modalState.hospitalId) {
			toastService.addToast(
				'Hospital context is missing.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const statusId = formActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;
		isSubmitting = true;
		try {
			const url = apiUrl(modalState.hospitalId);
			if (modalState.mode === 'create') {
				const res = await fetch(url, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					cache: 'no-store',
					credentials: 'include',
					body: JSON.stringify({
						name: formName.trim(),
						statusId
					})
				});
				const text = await res.text().catch(() => '');
				if (!res.ok) {
					throw new Error(
						text || `Request failed: ${res.status} ${res.statusText}`
					);
				}
				toastSuccess(
					toastService,
					m.entity_user_group(),
					m.toast_action_created()
				);
			} else if (modalState.editGroup) {
				const res = await fetch(url, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					cache: 'no-store',
					credentials: 'include',
					body: JSON.stringify({
						id: modalState.editGroup.id,
						name: formName.trim(),
						statusId
					})
				});
				const text = await res.text().catch(() => '');
				if (!res.ok) {
					throw new Error(
						text || `Request failed: ${res.status} ${res.statusText}`
					);
				}
				toastSuccess(
					toastService,
					m.entity_user_group(),
					m.toast_action_updated()
				);
			}
			confirm();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : 'Failed to save';
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
			<label for="ug-name" class="shrink-0 sm:w-36">Name <span class="text-error">*</span></label>
			<div class="max-w-80 flex-1">
				<WashInputField
					id="ug-name"
					bind:value={formName}
					inputType="text"
					inputPlaceholderText="Group name"
					required
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label class="shrink-0 sm:w-36">Active</label>
			<div class="flex max-w-80 flex-1 flex-wrap items-center gap-2">
				<label class="flex cursor-pointer items-center gap-2">
					<WashCheckbox bind:checked={formActive} />
				</label>
			</div>
		</div>
	</div>
	<div
		class="modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4"
	>
		<WashButton
			type="button"
			className="btn-ghost"
			onClick={() => cancel()}
		>
			Cancel
		</WashButton>
		<WashButton
			type="submit"
			className="btn-primary"
			loading={isSubmitting}
		>
			{isEdit ? m.update() : m.create()}
		</WashButton>
	</div>
</form>
