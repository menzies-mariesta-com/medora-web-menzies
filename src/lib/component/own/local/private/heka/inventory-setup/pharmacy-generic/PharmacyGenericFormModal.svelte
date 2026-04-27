<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCheckbox from '$lib/component/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import { PharmacyGenericModalState } from '$lib/state/pharmacy-generic-modal.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { page } from '$app/state';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { m } from '$lib/paraglide/messages';

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' && page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	const apiBase = $derived(
		hospitalId
			? `/api/heka/hospital/${hospitalId}/home/inventory-setup/pharmacy-generic`
			: ''
	);

	let name = $state('');
	let code = $state('');
	let formActive = $state(true);
	let isSubmitting = $state(false);
	let isLoading = $state(true);

	const modalState = $derived(PharmacyGenericModalState);
	const isEdit = $derived(
		modalState.mode === 'edit' && modalState.editRow != null
	);

	lifeCycleUtil.onMount(async () => {
		try {
			if (
				modalState.mode === 'edit' &&
				modalState.editRow != null
			) {
				const r = modalState.editRow;
				name = r.name ?? '';
				code = r.code ?? '';
				formActive =
					(r.statusId ?? StatusEnum.ACTIVE) === StatusEnum.ACTIVE;
			}
		} finally {
			isLoading = false;
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (isSubmitting || isLoading) return;
		if (!name?.trim()) {
			toastService.addToast(m.name_required(), StatusColorEnum.ERROR);
			return;
		}
		if (!apiBase) {
			toastService.addToast(m.delete_failed(), StatusColorEnum.ERROR);
			return;
		}
		const statusId = formActive
			? StatusEnum.ACTIVE
			: StatusEnum.INACTIVE;
		isSubmitting = true;
		try {
			if (modalState.mode === 'create') {
				const res = await fetch(apiBase, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						name: name.trim(),
						code: code.trim() || null,
						statusId
					})
				});
				if (!res.ok) {
					const t = await res.text().catch(() => '');
					throw new Error(t || `Create failed: ${res.status}`);
				}
				toastService.addToast(
					m.pharmacy_generic_created(),
					StatusColorEnum.SUCCESS
				);
			} else if (modalState.editRow) {
				const res = await fetch(apiBase, {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						id: modalState.editRow.id,
						name: name.trim(),
						code: code.trim() || null,
						statusId
					})
				});
				if (!res.ok) {
					const t = await res.text().catch(() => '');
					throw new Error(t || `Update failed: ${res.status}`);
				}
				toastService.addToast(
					m.pharmacy_generic_updated(),
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

{#if isLoading}
	<p class="text-sm opacity-70">{m.loading()}</p>
{:else}
	<form onsubmit={handleSubmit} class="flex flex-col gap-4">
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="pg-name" className="shrink-0 sm:w-40"
				>{m.pharmacy_generic_name()}
				<span class="text-error">*</span></DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiInputField
					id="pg-name"
					bind:value={name}
					inputType="text"
					inputPlaceholderText={m.pharmacy_generic_name_placeholder()}
					required
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel forText="pg-code" className="shrink-0 sm:w-40"
				>{m.pharmacy_generic_code()}</DaisyUiLabel
			>
			<div class="max-w-lg flex-1">
				<DaisyUiInputField
					id="pg-code"
					bind:value={code}
					inputType="text"
					inputPlaceholderText={m.pharmacy_generic_code_placeholder()}
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<DaisyUiLabel className="shrink-0 sm:w-40">{m.status()}</DaisyUiLabel>
			<div class="flex max-w-lg flex-1 flex-wrap items-center gap-2">
				<label class="flex cursor-pointer items-center gap-2">
					<DaisyUiCheckbox bind:checked={formActive} />
					<span class="text-sm opacity-80">{m.active_label()}</span>
				</label>
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
				{isEdit ? m.update() : m.create()}
			</DaisyUiButton>
		</div>
	</form>
{/if}
