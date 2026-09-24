<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCheckbox from '$lib/component/wash/checkbox/WashCheckbox.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { RoomCategoryModalState } from '$lib/state/room-category-modal.state.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	let { confirm, cancel }: DialogSlotProps = $props();

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	const categoryApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/room-master/room-category`
			: ''
	);

	let formName = $state('');
	let formCode = $state('');
	let formRoomMarkup = $state('0');
	let formActive = $state(true);
	let isSubmitting = $state(false);

	const modalState = $derived(RoomCategoryModalState);

	lifeCycleUtil.onMount(() => {
		const state = RoomCategoryModalState;
		if (state.mode === 'edit' && state.editCategory) {
			formName = state.editCategory.name ?? '';
			formCode = state.editCategory.code ?? '';
			formRoomMarkup = String(state.editCategory.roomMarkup ?? '0');
			formActive =
				(state.editCategory.statusId ?? StatusEnum.ACTIVE) ===
				StatusEnum.ACTIVE;
		} else {
			formName = '';
			formCode = '';
			formRoomMarkup = '0';
			formActive = true;
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (isSubmitting) return;
		if (!formName.trim()) {
			toastService.addToast(
				'Category name is required',
				StatusColorEnum.ERROR
			);
			return;
		}

		isSubmitting = true;
		try {
			if (!categoryApi) throw new Error('Hospital context missing');
			const isEdit =
				modalState.mode === 'edit' &&
				modalState.editCategory != null;
			const response = await fetch(categoryApi, {
				method: isEdit ? 'PUT' : 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					...(isEdit ? { id: modalState.editCategory?.id } : {}),
					name: formName.trim(),
					code: formCode.trim() || null,
					roomMarkup: formRoomMarkup.trim() || '0',
					statusId: formActive
						? StatusEnum.ACTIVE
						: StatusEnum.INACTIVE
				})
			});
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				throw new Error(
					text ||
						`${isEdit ? 'Update' : 'Create'} failed: ${response.status}`
				);
			}
			toastService.addToast(
				isEdit ? 'Room category updated' : 'Room category created',
				StatusColorEnum.SUCCESS
			);
			confirm();
		} catch (error) {
			toastService.addToast(
				error instanceof Error
					? error.message
					: 'Unable to save room category',
				StatusColorEnum.ERROR
			);
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
			<label for="room-category-name" class="shrink-0 sm:w-36">
				{m.name()} <span class="text-error">*</span>
			</label>
			<div class="max-w-80 flex-1">
				<WashInputField
					id="room-category-name"
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
			<label for="room-category-code" class="shrink-0 sm:w-36"
				>{m.code()}</label
			>
			<div class="max-w-80 flex-1">
				<WashInputField
					id="room-category-code"
					bind:value={formCode}
					inputType="text"
					inputPlaceholderText={m.code()}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="room-category-markup" class="shrink-0 sm:w-36"
				>Room markup (%)</label
			>
			<div class="max-w-80 flex-1">
				<WashInputField
					id="room-category-markup"
					bind:value={formRoomMarkup}
					inputType="number"
					inputPlaceholderText="0.00"
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<span class="shrink-0 sm:w-36">{m.status()}</span>
			<label
				class="flex max-w-80 flex-1 cursor-pointer items-center gap-2"
			>
				<WashCheckbox bind:checked={formActive} />
				<span class="text-sm opacity-80">{m.active_label()}</span>
			</label>
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
			{m.cancel()}
		</WashButton>
		<WashButton
			type="submit"
			className="btn-primary"
			loading={isSubmitting}
		>
			{m.ok()}
		</WashButton>
	</div>
</form>
