<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCheckbox from '$lib/component/wash/checkbox/WashCheckbox.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { EdTriageLevelModalState } from '$lib/state/ed-triage-level-modal.state.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const msg = m as Record<string, (inputs?: object) => string>;

	let { confirm, cancel }: DialogSlotProps = $props();

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const triageApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/er-triage-level`
			: ''
	);

	let formLevel = $state('1');
	let formName = $state('');
	let formColor = $state('error');
	let formActive = $state(true);
	let isSubmitting = $state(false);

	const modalState = $derived(EdTriageLevelModalState);

	const levelOptions = [1, 2, 3, 4, 5].map((n) => ({
		value: String(n),
		label: String(n)
	}));
	const colorOptions = [
		'error',
		'warning',
		'info',
		'accent',
		'success',
		'primary',
		'secondary',
		'neutral'
	].map((c) => ({ value: c, label: c }));

	lifeCycleUtil.onMount(() => {
		const state = EdTriageLevelModalState;
		if (state.mode === 'edit' && state.editRow) {
			formLevel = String(state.editRow.level);
			formName = state.editRow.name ?? '';
			formColor = state.editRow.color ?? 'neutral';
			formActive =
				(state.editRow.statusId ?? StatusEnum.ACTIVE) ===
				StatusEnum.ACTIVE;
		} else {
			formLevel = '1';
			formName = '';
			formColor = 'error';
			formActive = true;
		}
	});

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (isSubmitting) return;
		if (!formName.trim()) {
			toastService.addToast(
				msg.ed_triage_level_name_required?.() ?? 'Name is required',
				StatusColorEnum.ERROR
			);
			return;
		}

		isSubmitting = true;
		try {
			if (!triageApi) throw new Error('Hospital context missing');
			const isEdit =
				modalState.mode === 'edit' && modalState.editRow != null;
			const response = await fetch(triageApi, {
				method: isEdit ? 'PUT' : 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					...(isEdit ? { id: modalState.editRow?.id } : {}),
					level: Number(formLevel),
					name: formName.trim(),
					color: formColor,
					statusId: formActive
						? StatusEnum.ACTIVE
						: StatusEnum.INACTIVE
				})
			});
			if (!response.ok) {
				const text = await response.text().catch(() => '');
				throw new Error(text || `Save failed (${response.status})`);
			}
			toastService.addToast(
				isEdit
					? (msg.ed_triage_level_updated?.() ?? 'Triage level updated')
					: (msg.ed_triage_level_created?.() ?? 'Triage level created'),
				StatusColorEnum.SUCCESS
			);
			confirm();
		} catch (error) {
			toastService.addToast(
				error instanceof Error ? error.message : 'Unable to save',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex min-h-0 flex-1 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
		<div class="flex flex-col gap-4">
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="triage-level" class="shrink-0 sm:w-36">
					{msg.ed_triage_level_col_level?.() ?? 'Level'}<span
						class="text-error align-top text-sm leading-none"
						aria-hidden="true">*</span
					>
				</label>
				<div class="max-w-80 flex-1">
					<WashSelect
						id="triage-level"
						bind:value={formLevel}
						options={levelOptions}
						disabled={modalState.mode === 'edit'}
						required
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="triage-name" class="shrink-0 sm:w-36">
					{m.name()}<span
						class="text-error align-top text-sm leading-none"
						aria-hidden="true">*</span
					>
				</label>
				<div class="max-w-80 flex-1">
					<WashInputField
						id="triage-name"
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
				<label for="triage-color" class="shrink-0 sm:w-36">
					{msg.ed_triage_level_col_color?.() ?? 'Badge color'}
				</label>
				<div class="max-w-80 flex-1">
					<WashSelect
						id="triage-color"
						bind:value={formColor}
						options={colorOptions}
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
	</div>
	<WashDialogFooter className="gap-2">
		<WashButton
			type="button"
			className="btn-ghost cursor-pointer"
			onClick={() => cancel()}
		>
			{m.cancel()}
		</WashButton>
		<WashButton
			type="submit"
			className="btn-primary cursor-pointer"
			loading={isSubmitting}
			disabled={isSubmitting}
		>
			{m.ok()}
		</WashButton>
	</WashDialogFooter>
</form>
