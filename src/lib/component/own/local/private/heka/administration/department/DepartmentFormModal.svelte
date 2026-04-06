<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCheckbox from '$lib/component/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import {
		createDepartment,
		updateDepartment
	} from '$lib/remote/table/master-table/department.remote';
	import { DepartmentModalState } from '$lib/state/department-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();

	let formName = $state('');
	let formCode = $state('');
	let formActive = $state(true);
	let isSubmitting = $state(false);

	const state = $derived(DepartmentModalState);
	const isEdit = $derived(
		state.mode === 'edit' && state.editDepartment != null
	);

	$effect(() => {
		const s = DepartmentModalState;
		if (s.mode === 'edit' && s.editDepartment) {
			formName = s.editDepartment.name ?? '';
			formCode = s.editDepartment.code ?? '';
			formActive =
				(s.editDepartment.statusId ?? StatusEnum.ACTIVE) ===
				StatusEnum.ACTIVE;
		} else {
			formName = '';
			formCode = '';
			formActive = true;
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting) return;
		if (!formName?.trim()) {
			toastService.addToast(m.name_required(), StatusColorEnum.ERROR);
			return;
		}
		const statusId = formActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;
		isSubmitting = true;
		try {
			if (state.mode === 'create') {
				await createDepartment({
					name: formName.trim(),
					code: formCode.trim() || null,
					statusId
				});
				toastService.addToast(
					m.department_created(),
					StatusColorEnum.SUCCESS
				);
			} else if (state.editDepartment) {
				await updateDepartment({
					id: state.editDepartment.id,
					name: formName.trim(),
					code: formCode.trim() || null,
					statusId
				});
				toastService.addToast(
					m.department_updated(),
					StatusColorEnum.SUCCESS
				);
			}
			confirm();
		} catch (err) {
			const msg =
				err instanceof Error ? err.message : m.delete_failed();
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
			<DaisyUiLabel forText="dept-name" className="shrink-0 sm:w-36"
				>{m.name()} <span class="text-error">*</span></DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="dept-name"
					bind:value={formName}
					inputType="text"
					inputPlaceholderText={m.name()}
					required
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="dept-code" className="shrink-0 sm:w-36"
				>{m.code()}</DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="dept-code"
					bind:value={formCode}
					inputType="text"
					inputPlaceholderText={m.code()}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel className="shrink-0 sm:w-36">{m.status()}</DaisyUiLabel>
			<div class="flex max-w-80 flex-1 flex-wrap items-center gap-2">
				<label class="flex cursor-pointer items-center gap-2">
					<DaisyUiCheckbox bind:checked={formActive} />
					<span class="text-sm opacity-80">{m.active_label()}</span>
				</label>
			</div>
		</div>
	</div>
	<div
		class="d-modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4"
	>
		<DaisyUiButton
			type="button"
			className="d-btn-ghost"
			onClick={() => cancel()}
		>
			{m.cancel()}
		</DaisyUiButton>
		<DaisyUiButton
			type="submit"
			className="d-btn-primary"
			loading={isSubmitting}
		>
			{isEdit ? m.save() : m.create()}
		</DaisyUiButton>
	</div>
</form>
