<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCheckbox from '$lib/component/library/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import {
		createUserGroup,
		updateUserGroup
	} from '$lib/remote/table/information-table/user-group.remote';
	import { UserGroupModalState } from '$lib/state/user-group-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();

	let formName = $state('');
	let formActive = $state(true);
	let isSubmitting = $state(false);

	const state = $derived(UserGroupModalState);
	const isEdit = $derived(state.mode === 'edit' && state.editGroup != null);

	$effect(() => {
		const s = UserGroupModalState;
		if (s.mode === 'edit' && s.editGroup) {
			formName = s.editGroup.name ?? '';
			formActive = (s.editGroup.statusId ?? StatusEnum.ACTIVE) === StatusEnum.ACTIVE;
		} else {
			formName = '';
			formActive = true;
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!formName?.trim()) {
			toastService.addToast('Name is required.', StatusColorEnum.ERROR);
			return;
		}
		if (!state.hospitalId) {
			toastService.addToast('Hospital context is missing.', StatusColorEnum.ERROR);
			return;
		}
		const statusId = formActive ? StatusEnum.ACTIVE : StatusEnum.INACTIVE;
		isSubmitting = true;
		try {
			if (state.mode === 'create') {
				await createUserGroup({
					name: formName.trim(),
					statusId,
					hospitalId: state.hospitalId
				});
				toastService.addToast('User group created.', StatusColorEnum.SUCCESS);
			} else if (state.editGroup) {
				await updateUserGroup({
					id: state.editGroup.id,
					name: formName.trim(),
					statusId
				});
				toastService.addToast('User group updated.', StatusColorEnum.SUCCESS);
			}
			confirm();
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to save';
			toastService.addToast(msg, StatusColorEnum.ERROR);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-4">
	<div class="flex flex-col gap-4">
		<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel forText="ug-name" className="shrink-0 sm:w-36">Name <span class="text-error">*</span></DaisyUiLabel>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="ug-name"
					bind:value={formName}
					inputType="text"
					inputPlaceholderText="Group name"
					required
				/>
			</div>
		</div>
		<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel className="shrink-0 sm:w-36">Active</DaisyUiLabel>
			<div class="max-w-80 flex-1 flex flex-wrap items-center gap-2">
				<label class="flex cursor-pointer items-center gap-2">
					<DaisyUiCheckbox bind:checked={formActive} />
				</label>
			</div>
		</div>
	</div>
	<div class="d-modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4">
		<DaisyUiButton type="button" className="d-btn-ghost" onClick={() => cancel()}>
			Cancel
		</DaisyUiButton>
		<DaisyUiButton type="submit" className="d-btn-primary" disabled={isSubmitting}>
			{isSubmitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
		</DaisyUiButton>
	</div>
</form>
