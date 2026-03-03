<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import {
		createSubCategory,
		updateSubCategory
	} from '$lib/remote/table/information-table/sub-category.remote';
	import { SubCategoryModalState } from '$lib/state/sub-category-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();

	let formSubCategoryName = $state('');
	let formCategoryId = $state<string>('');
	let formActive = $state(true);
	let isSubmitting = $state(false);

	const state = $derived(SubCategoryModalState);
	const isEdit = $derived(state.mode === 'edit' && state.editRow != null);

	$effect(() => {
		const s = SubCategoryModalState;
		if (s.mode === 'edit' && s.editRow) {
			formSubCategoryName = s.editRow.subCategoryName ?? '';
			formCategoryId = String(s.editRow.categoryId);
			formActive = (s.editRow.statusId ?? StatusEnum.ACTIVE) === StatusEnum.ACTIVE;
		} else {
			formSubCategoryName = '';
			formCategoryId = s.defaultCategoryId != null ? String(s.defaultCategoryId) : '';
			formActive = true;
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!formSubCategoryName?.trim()) {
			toastService.addToast('Sub-category name is required.', StatusColorEnum.ERROR);
			return;
		}
		const categoryId = formCategoryId ? Number(formCategoryId) : null;
		if (state.mode === 'create' && (categoryId == null || Number.isNaN(categoryId))) {
			toastService.addToast('Category is required.', StatusColorEnum.ERROR);
			return;
		}
		const statusId = formActive ? StatusEnum.ACTIVE : StatusEnum.INACTIVE;
		isSubmitting = true;
		try {
			if (state.mode === 'create' && categoryId != null) {
				await createSubCategory({
					categoryId,
					subCategoryName: formSubCategoryName.trim(),
					statusId
				});
				toastService.addToast('Sub-category created.', StatusColorEnum.SUCCESS);
			} else if (state.editRow) {
				await updateSubCategory({
					id: state.editRow.id,
					subCategoryName: formSubCategoryName.trim(),
					statusId
				});
				toastService.addToast('Sub-category updated.', StatusColorEnum.SUCCESS);
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
		{#if !isEdit}
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="sc-category" className="shrink-0 sm:w-36"
					>Category <span class="text-error">*</span></DaisyUiLabel
				>
				<div class="max-w-80 flex-1">
					<select
						id="sc-category"
						bind:value={formCategoryId}
						class="d-select d-select-bordered d-select-sm w-full"
						required
					>
						<option value="">Select category…</option>
						{#if state.categoryOptions?.length}
							{#each state.categoryOptions as cat (cat.id)}
								<option value={cat.id}>{cat.categoryName ?? `Category ${cat.id}`}</option>
							{/each}
						{/if}
					</select>
				</div>
			</div>
		{/if}
		<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel forText="sc-name" className="shrink-0 sm:w-36"
				>{m.name()} <span class="text-error">*</span></DaisyUiLabel
			>
			<div class="max-w-80 flex-1">
				<DaisyUiInputField
					id="sc-name"
					bind:value={formSubCategoryName}
					inputType="text"
					inputPlaceholderText="Sub-category name"
					required
				/>
			</div>
		</div>
		<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel className="shrink-0 sm:w-36">Active</DaisyUiLabel>
			<div class="max-w-80 flex-1 flex flex-wrap items-center gap-2">
				<label class="flex cursor-pointer items-center gap-2">
					<input type="checkbox" bind:checked={formActive} class="d-checkbox d-checkbox-sm" />
					<span class="text-sm">Active</span>
				</label>
			</div>
		</div>
	</div>
	<div class="d-modal-action flex shrink-0 justify-end gap-2 border-t border-base-300 pt-4">
		<DaisyUiButton type="button" className="d-btn-ghost" onClick={() => cancel()}>
			{m.cancel()}
		</DaisyUiButton>
		<DaisyUiButton type="submit" className="d-btn-primary" disabled={isSubmitting}>
			{isSubmitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
		</DaisyUiButton>
	</div>
</form>
