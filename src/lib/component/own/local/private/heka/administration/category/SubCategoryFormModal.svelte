<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import { SubCategoryModalState } from '$lib/state/sub-category-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();

	let formSubCategoryName = $state('');
	let formCategoryId = $state<string>('');
	let formActive = $state(true);
	let isSubmitting = $state(false);

	const modalState = $derived(SubCategoryModalState);
	const isEdit = $derived(
		modalState.mode === 'edit' && modalState.editRow != null
	);
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);

	async function fetchJson<T>(
		input: string,
		init?: RequestInit
	): Promise<T> {
		const res = await fetch(input, {
			...init,
			headers: {
				...(init?.headers ?? {}),
				'content-type': 'application/json'
			}
		});
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	$effect(() => {
		const s = SubCategoryModalState;
		if (s.mode === 'edit' && s.editRow) {
			formSubCategoryName = s.editRow.subCategoryName ?? '';
			formCategoryId = String(s.editRow.categoryId);
			formActive =
				(s.editRow.statusId ?? StatusEnum.ACTIVE) ===
				StatusEnum.ACTIVE;
		} else {
			formSubCategoryName = '';
			formCategoryId =
				s.defaultCategoryId != null
					? String(s.defaultCategoryId)
					: '';
			formActive = true;
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting) return;
		if (!formSubCategoryName?.trim()) {
			toastService.addToast(
				'Sub-category name is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const categoryId = formCategoryId ? Number(formCategoryId) : null;
		if (
			modalState.mode === 'create' &&
			(categoryId == null || Number.isNaN(categoryId))
		) {
			toastService.addToast(
				'Category is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const statusId = formActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;
		isSubmitting = true;
		try {
			if (!hospitalId)
				throw new Error('Missing hospital context for sub-category');
			if (modalState.mode === 'create' && categoryId != null) {
				await fetchJson(
					`/api/heka/hospital/${hospitalId}/home/administration/service-order/sub-category-master`,
					{
						method: 'POST',
						body: JSON.stringify({
							categoryId,
							subCategoryName: formSubCategoryName.trim(),
							statusId
						})
					}
				);
				toastSuccess(
					toastService,
					m.entity_sub_category(),
					m.toast_action_created()
				);
			} else if (modalState.editRow) {
				await fetchJson(
					`/api/heka/hospital/${hospitalId}/home/administration/service-order/sub-category-master`,
					{
						method: 'PUT',
						body: JSON.stringify({
							id: modalState.editRow.id,
							subCategoryName: formSubCategoryName.trim(),
							statusId
						})
					}
				);
				toastSuccess(
					toastService,
					m.entity_sub_category(),
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
		{#if !isEdit}
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<DaisyUiLabel
					forText="sc-category"
					className="shrink-0 sm:w-36"
					>Category <span class="text-error">*</span></DaisyUiLabel
				>
				<div class="max-w-80 flex-1">
					<select
						id="sc-category"
						bind:value={formCategoryId}
						class="d-select-bordered d-select w-full d-select-sm"
						required
					>
						<option value="">Select category…</option>
						{#if modalState.categoryOptions?.length}
							{#each modalState.categoryOptions as cat (cat.id)}
								<option value={cat.id}
									>{cat.categoryName ?? `Category ${cat.id}`}</option
								>
							{/each}
						{/if}
					</select>
				</div>
			</div>
		{/if}
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
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
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel className="shrink-0 sm:w-36">Active</DaisyUiLabel>
			<div class="flex max-w-80 flex-1 flex-wrap items-center gap-2">
				<label class="flex cursor-pointer items-center gap-2">
					<input
						type="checkbox"
						bind:checked={formActive}
						class="d-checkbox d-checkbox-sm"
					/>
					<span class="text-sm">Active</span>
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
			{isEdit ? 'Save' : 'Create'}
		</DaisyUiButton>
	</div>
</form>
