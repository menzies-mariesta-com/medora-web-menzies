<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCheckbox from '$lib/component/wash/checkbox/WashCheckbox.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import type { WardRow } from '$lib/model/type/medora/ipd/ipd.type';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { BedModalState } from '$lib/state/bed-modal.state.svelte';
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
	const administrationApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration`
			: ''
	);
	const bedApi = $derived(
		administrationApi ? `${administrationApi}/bed-master` : ''
	);

	let wards = $state<WardRow[]>([]);
	let formWardId = $state('');
	let formName = $state('');
	let formCode = $state('');
	let formActive = $state(true);
	let isLoadingWards = $state(false);
	let isSubmitting = $state(false);

	const modalState = $derived(BedModalState);
	const wardOptions = $derived(
		wards.map((ward) => ({
			value: String(ward.id),
			label: ward.code ? `${ward.name} (${ward.code})` : ward.name
		}))
	);

	$effect(() => {
		const state = BedModalState;
		if (state.mode === 'edit' && state.editBed) {
			formWardId = String(state.editBed.wardId);
			formName = state.editBed.name ?? '';
			formCode = state.editBed.code ?? '';
			formActive =
				(state.editBed.statusId ?? StatusEnum.ACTIVE) ===
				StatusEnum.ACTIVE;
		} else {
			formWardId = '';
			formName = '';
			formCode = '';
			formActive = true;
		}
	});

	async function loadWards() {
		if (!administrationApi) return;
		isLoadingWards = true;
		try {
			const response = await fetch(
				`${administrationApi}/ward-master?active=1`,
				{ credentials: 'include', cache: 'no-store' }
			);
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				throw new Error(
					text || `Load wards failed: ${response.status}`
				);
			}
			wards = (await response.json()) as WardRow[];
		} catch (error) {
			toastService.addToast(
				error instanceof Error
					? error.message
					: 'Unable to load wards',
				StatusColorEnum.ERROR
			);
		} finally {
			isLoadingWards = false;
		}
	}

	lifeCycleUtil.onMount(loadWards);

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (isSubmitting) return;
		const wardId = Number(formWardId);
		if (!Number.isFinite(wardId) || wardId <= 0) {
			toastService.addToast(
				'Ward is required',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!formName.trim()) {
			toastService.addToast(
				'Bed name is required',
				StatusColorEnum.ERROR
			);
			return;
		}

		isSubmitting = true;
		try {
			if (!bedApi) throw new Error('Hospital context missing');
			const isEdit =
				modalState.mode === 'edit' && modalState.editBed != null;
			const response = await fetch(bedApi, {
				method: isEdit ? 'PUT' : 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					...(isEdit ? { id: modalState.editBed?.id } : {}),
					wardId,
					name: formName.trim(),
					code: formCode.trim() || null,
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
				isEdit ? 'Bed updated' : 'Bed created',
				StatusColorEnum.SUCCESS
			);
			confirm();
		} catch (error) {
			toastService.addToast(
				error instanceof Error ? error.message : 'Unable to save bed',
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
			<label for="bed-ward" class="shrink-0 sm:w-36">
				Ward <span class="text-error">*</span>
			</label>
			<div class="max-w-80 flex-1">
				<WashSelect
					id="bed-ward"
					bind:value={formWardId}
					options={wardOptions}
					placeholder={isLoadingWards
						? 'Loading wards…'
						: 'Select ward'}
					disabled={isLoadingWards}
					required
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="bed-name" class="shrink-0 sm:w-36">
				{m.name()} <span class="text-error">*</span>
			</label>
			<div class="max-w-80 flex-1">
				<WashInputField
					id="bed-name"
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
			<label for="bed-code" class="shrink-0 sm:w-36">{m.code()}</label
			>
			<div class="max-w-80 flex-1">
				<WashInputField
					id="bed-code"
					bind:value={formCode}
					inputType="text"
					inputPlaceholderText={m.code()}
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
