<script lang="ts">
	import { page } from '$app/state';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { ObservationFormEntryDialogState } from '$lib/state/observation-form-entry-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiTextarea from '$lib/component/daisyui/textarea/DaisyUiTextarea.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();
	let { confirm, cancel }: DialogSlotProps = $props();

	const hospitalId = $derived(page.params.hospital_id ?? '');

	const entryId = $derived(ObservationFormEntryDialogState.entryId);
	const visitId = $derived(ObservationFormEntryDialogState.visitId);
	const branchId = $derived(ObservationFormEntryDialogState.branchId);
	const patientId = $derived(
		ObservationFormEntryDialogState.patientId
	);
	const formCode = $derived(ObservationFormEntryDialogState.formCode);
	const isEdit = $derived(entryId != null);

	let description = $state('');
	let statusIdStr = $state(String(StatusEnum.ACTIVE));
	let isSubmitting = $state(false);
	let loadSeq = 0;

	type FormEntryRow = {
		id: number;
		description: string | null;
		statusId: number | null;
	};

	async function apiGet<T>(
		mode: string,
		params?: Record<string, string>
	) {
		const hid = hospitalId;
		if (!hid) throw new Error('Hospital is required');
		const url = new URL(
			`/api/heka/hospital/${hid}/home/observation/emr`,
			location.origin
		);
		url.searchParams.set('mode', mode);
		if (params) {
			for (const [k, v] of Object.entries(params)) {
				url.searchParams.set(k, v);
			}
		}
		const res = await fetch(url.toString());
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	async function apiPost<T>(mode: string, payload: unknown) {
		const hid = hospitalId;
		if (!hid) throw new Error('Hospital is required');
		const res = await fetch(
			`/api/heka/hospital/${hid}/home/observation/emr`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode,
					...(payload as Record<string, unknown>)
				})
			}
		);
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	$effect(() => {
		const id = entryId;
		if (!id) {
			description = '';
			statusIdStr = String(StatusEnum.ACTIVE);
			return;
		}
		const seq = ++loadSeq;
		void apiGet<FormEntryRow | null>('formEntry.get', {
			id: String(id)
		})
			.then((row) => {
				if (seq !== loadSeq) return;
				if (!row) {
					toastService.addToast(
						'Form entry not found.',
						StatusColorEnum.ERROR
					);
					cancel();
					return;
				}
				description = row.description ?? '';
				statusIdStr = String(row.statusId ?? StatusEnum.ACTIVE);
			})
			.catch((err) => {
				if (seq !== loadSeq) return;
				toastService.addToast(
					(err instanceof Error
						? err.message
						: m.observation_emr_save_failed()) as string,
					StatusColorEnum.ERROR
				);
				cancel();
			});
	});

	async function handleSave() {
		const vid = visitId;
		const bid = branchId;
		const pid = patientId;
		const fcode = formCode?.trim() ?? '';
		if (!vid || !bid || !pid || !fcode) {
			toastService.addToast(
				m.observation_emr_visit_missing(),
				StatusColorEnum.ERROR
			);
			return;
		}
		const desc = description.trim();
		if (!desc) {
			toastService.addToast(
				'Description is required.',
				StatusColorEnum.ERROR
			);
			return;
		}
		isSubmitting = true;
		try {
			if (isEdit && entryId != null) {
				await apiPost('formEntry.update', {
					payload: {
						id: entryId,
						description: desc,
						statusId: Number(statusIdStr) || StatusEnum.ACTIVE
					}
				});
			} else {
				await apiPost('formEntry.create', {
					payload: {
						branchId: bid,
						patientId: pid,
						visitId: vid,
						formCode: fcode,
						description: desc,
						statusId: StatusEnum.ACTIVE
					}
				});
			}
			ObservationFormEntryDialogState.onSaved?.();
			await confirm({ saved: true });
		} catch (err) {
			toastService.addToast(
				(err instanceof Error
					? err.message
					: m.observation_emr_save_failed()) as string,
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-1">
		<DaisyUiLabel forText="form-entry-description">
			{m.observation_emr_instruction()}
		</DaisyUiLabel>
		<DaisyUiTextarea
			id="form-entry-description"
			className="d-textarea-bordered min-h-28 w-full"
			bind:value={description}
			placeholder={m.observation_emr_note_placeholder()}
		/>
	</div>

	{#if isEdit}
		<div class="flex flex-col gap-1">
			<DaisyUiLabel forText="form-entry-status">
				{m.observation_emr_status()}
			</DaisyUiLabel>
			<DaisyUiSelect
				name="form-entry-status"
				className="d-select-bordered w-full"
				bind:value={statusIdStr}
				disabled={isSubmitting}
			>
				<option value={String(StatusEnum.ACTIVE)}>Active</option>
				<option value={String(StatusEnum.INACTIVE)}>Inactive</option>
			</DaisyUiSelect>
		</div>
	{/if}

	<div class="flex flex-wrap justify-end gap-2 pt-2">
		<DaisyUiButton
			type="button"
			className="d-btn d-btn-ghost"
			disabled={isSubmitting}
			onClick={() => cancel()}
		>
			{m.observation_emr_cancel()}
		</DaisyUiButton>
		<DaisyUiButton
			type="button"
			className="d-btn d-btn-primary"
			disabled={isSubmitting}
			loading={isSubmitting}
			onClick={() => void handleSave()}
		>
			{m.observation_emr_save()}
		</DaisyUiButton>
	</div>
</div>
