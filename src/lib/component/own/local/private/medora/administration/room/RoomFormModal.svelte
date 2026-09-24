<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCheckbox from '$lib/component/wash/checkbox/WashCheckbox.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type {
		RoomCategoryRow,
		WardRow
	} from '$lib/model/type/medora/ipd/ipd.type';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { RoomModalState } from '$lib/state/room-modal.state.svelte';
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
	const roomApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/room-master`
			: ''
	);
	const wardApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/ward-master`
			: ''
	);
	const categoryApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/room-master/room-category`
			: ''
	);

	let wards = $state<WardRow[]>([]);
	let categories = $state<RoomCategoryRow[]>([]);
	let formWardId = $state('');
	let formRoomCategoryId = $state('');
	let formName = $state('');
	let formCode = $state('');
	let formAmenities = $state('');
	let formActive = $state(true);
	let isSubmitting = $state(false);
	let isLoading = $state(true);
	let bedCount = $state(0);

	const modalState = $derived(RoomModalState);
	const wardOptions = $derived(
		wards.map((w) => ({
			value: String(w.id),
			label: w.code ? `${w.name} (${w.code})` : w.name
		}))
	);
	const categoryOptions = $derived(
		categories.map((c) => ({
			value: String(c.id),
			label: c.code
				? `${c.name} (${c.code}) — markup ${c.roomMarkup ?? '0'}%`
				: `${c.name} — markup ${c.roomMarkup ?? '0'}%`
		}))
	);

	lifeCycleUtil.onMount(async () => {
		try {
			const [wardRes, catRes] = await Promise.all([
				wardApi
					? fetch(`${wardApi}?active=1`, {
							credentials: 'include',
							cache: 'no-store'
						})
					: null,
				categoryApi
					? fetch(`${categoryApi}?active=1`, {
							credentials: 'include',
							cache: 'no-store'
						})
					: null
			]);
			if (wardRes?.ok) wards = (await wardRes.json()) as WardRow[];
			if (catRes?.ok)
				categories = (await catRes.json()) as RoomCategoryRow[];

			const state = RoomModalState;
			if (state.mode === 'edit' && state.editRoom) {
				formWardId = String(state.editRoom.wardId);
				formRoomCategoryId = String(
					state.editRoom.roomCategoryId ?? ''
				);
				formName = state.editRoom.name ?? '';
				formCode = state.editRoom.code ?? '';
				formAmenities = state.editRoom.amenities ?? '';
				bedCount =
					state.editRoom.bedCount ?? state.editRoom.capacity ?? 0;
				formActive =
					(state.editRoom.statusId ?? StatusEnum.ACTIVE) ===
					StatusEnum.ACTIVE;
			} else {
				formWardId = wards[0] ? String(wards[0].id) : '';
				formRoomCategoryId =
					categories[0] != null ? String(categories[0].id) : '';
				formName = '';
				formCode = '';
				formAmenities = '';
				bedCount = 0;
				formActive = true;
			}
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Unable to load form data',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoading = false;
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (isSubmitting || isLoading) return;
		const wardId = Number(formWardId);
		if (!Number.isFinite(wardId) || wardId <= 0) {
			toastService.addToast('Ward is required', StatusColorEnum.ERROR);
			return;
		}
		const roomCategoryId = Number(formRoomCategoryId);
		if (!Number.isFinite(roomCategoryId) || roomCategoryId <= 0) {
			toastService.addToast(
				'Room category is required',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!formName.trim()) {
			toastService.addToast(
				'Room name is required',
				StatusColorEnum.ERROR
			);
			return;
		}

		isSubmitting = true;
		try {
			if (!roomApi) throw new Error('Hospital context missing');
			const isEdit =
				modalState.mode === 'edit' && modalState.editRoom != null;
			const response = await fetch(roomApi, {
				method: isEdit ? 'PUT' : 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					...(isEdit ? { id: modalState.editRoom?.id } : {}),
					wardId,
					roomCategoryId,
					name: formName.trim(),
					code: formCode.trim() || null,
					amenities: formAmenities.trim() || null,
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
				isEdit ? 'Room updated' : 'Room created',
				StatusColorEnum.SUCCESS
			);
			confirm();
		} catch (error) {
			toastService.addToast(
				error instanceof Error
					? error.message
					: 'Unable to save room',
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
			<label for="room-ward" class="shrink-0 sm:w-36">
				Ward <span class="text-error">*</span>
			</label>
			<div class="max-w-80 flex-1">
				<WashSelect
					id="room-ward"
					bind:value={formWardId}
					options={wardOptions}
					placeholder="Select ward"
					disabled={isLoading || wards.length === 0}
					required
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="room-category" class="shrink-0 sm:w-36">
				Room category <span class="text-error">*</span>
			</label>
			<div class="max-w-80 flex-1">
				<WashSelect
					id="room-category"
					bind:value={formRoomCategoryId}
					options={categoryOptions}
					placeholder="Select room category"
					disabled={isLoading || categories.length === 0}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="room-name" class="shrink-0 sm:w-36">
				{m.name()} <span class="text-error">*</span>
			</label>
			<div class="max-w-80 flex-1">
				<WashInputField
					id="room-name"
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
			<label for="room-code" class="shrink-0 sm:w-36">{m.code()}</label>
			<div class="max-w-80 flex-1">
				<WashInputField
					id="room-code"
					bind:value={formCode}
					inputType="text"
					inputPlaceholderText={m.code()}
				/>
			</div>
		</div>
		{#if modalState.mode === 'edit'}
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<span class="shrink-0 sm:w-36">Beds</span>
				<div class="max-w-80 flex-1 text-sm opacity-80">
					{bedCount} (from Bed Master)
				</div>
			</div>
		{/if}
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="room-amenities" class="shrink-0 sm:w-36"
				>Amenities</label
			>
			<div class="max-w-80 flex-1">
				<WashInputField
					id="room-amenities"
					bind:value={formAmenities}
					inputType="text"
					inputPlaceholderText="e.g. Ensuite, Isolation"
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
			disabled={isLoading}
		>
			{m.ok()}
		</WashButton>
	</div>
</form>
