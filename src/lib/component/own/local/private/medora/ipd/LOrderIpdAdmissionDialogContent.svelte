<script lang="ts">
	/**
	 * Doctor: Order IPD Admission from an OPD consultation visit.
	 */
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import {
		IpdAdmissionCareLevelEnum,
		IpdAdmissionUrgencyEnum
	} from '$lib/model/enum/db-link';
	import type { WardRow } from '$lib/model/type/medora/ipd/ipd.type';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialogFooter from '$lib/component/wash/dialog/WashDialogFooter.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { m } from '$lib/paraglide/messages';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const msg = m as Record<string, (inputs?: object) => string>;

	let {
		confirm,
		cancel,
		hospitalId,
		sourceOpdVisitId,
		branchId,
		orderingDoctorId = null
	}: DialogSlotProps & {
		hospitalId: string;
		sourceOpdVisitId: string;
		branchId: string;
		orderingDoctorId?: string | null;
	} = $props();

	const toastService = new ToastService();
	let careLevel = $state(String(IpdAdmissionCareLevelEnum.GENERAL));
	let urgency = $state(String(IpdAdmissionUrgencyEnum.ROUTINE));
	let preferredWardId = $state('');
	let notes = $state('');
	let wards = $state<WardRow[]>([]);
	let isSubmitting = $state(false);

	const careLevelOptions = [
		{ value: String(IpdAdmissionCareLevelEnum.GENERAL), label: 'General' },
		{
			value: String(IpdAdmissionCareLevelEnum.SEMI_PRIVATE),
			label: 'Semi-Private'
		},
		{ value: String(IpdAdmissionCareLevelEnum.PRIVATE), label: 'Private' }
	];
	const urgencyOptions = [
		{ value: String(IpdAdmissionUrgencyEnum.ROUTINE), label: 'Routine' },
		{ value: String(IpdAdmissionUrgencyEnum.URGENT), label: 'Urgent' }
	];
	const wardOptions = $derived([
		{ value: '', label: 'Any / not specified' },
		...wards.map((w) => ({
			value: String(w.id),
			label: w.code ? `${w.name} (${w.code})` : w.name
		}))
	]);

	$effect(() => {
		if (!hospitalId) return;
		void (async () => {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/administration/ward-master?active=1`,
				{ credentials: 'include' }
			);
			if (res.ok) wards = (await res.json()) as WardRow[];
		})();
	});

	async function handleConfirm() {
		if (isSubmitting) return;
		isSubmitting = true;
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/adt/admission-order`,
				{
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						action: 'create',
						sourceOpdVisitId,
						branchId,
						careLevel: Number(careLevel),
						urgency: Number(urgency),
						preferredWardId: preferredWardId
							? Number(preferredWardId)
							: null,
						notes: notes.trim() || null,
						orderingDoctorId
					})
				}
			);
			if (!res.ok) await throwUserFacingHttpError(res);
			const data = await res.json();
			toastService.addToast(
				'IPD admission ordered — pending at ADT desk',
				StatusColorEnum.SUCCESS
			);
			await confirm(data);
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Failed to create order',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-3">
	<p class="text-sm text-base-content/80">
		Creates a pending admission for the ADT desk (care level and urgency).
		Bed assignment happens when ADT admits the patient.
	</p>
	<div  class="flex min-w-0 flex-col gap-1 text-sm"><label for="a11y-lorderipdadmissiondialog-15e3dd">Care level</label> <WashSelect bind:value={careLevel} options={careLevelOptions} id="a11y-lorderipdadmissiondialog-15e3dd" /></div>
	<div  class="flex min-w-0 flex-col gap-1 text-sm"><label for="a11y-lorderipdadmissiondialog-4339fa">Urgency</label> <WashSelect bind:value={urgency} options={urgencyOptions} id="a11y-lorderipdadmissiondialog-4339fa" /></div>
	<div  class="flex min-w-0 flex-col gap-1 text-sm"><label for="a11y-lorderipdadmissiondialog-0022dd">Preferred ward (optional)</label> <WashSelect
			bind:value={preferredWardId}
			options={wardOptions} id="a11y-lorderipdadmissiondialog-0022dd" /></div>
	<label class="flex min-w-0 flex-col gap-1 text-sm">
		Notes
		<textarea
			class="textarea-bordered textarea w-full"
			rows="2"
			bind:value={notes}
		></textarea>
	</label>
</div>
<WashDialogFooter>
	<WashButton
		type="button"
		className="btn-ghost"
		disabled={isSubmitting}
		onClick={cancel}
	>
		{msg.cancel?.() ?? 'Cancel'}
	</WashButton>
	<WashButton
		type="button"
		className="btn-primary"
		disabled={isSubmitting}
		loading={isSubmitting}
		onClick={handleConfirm}
	>
		Order IPD Admission
	</WashButton>
</WashDialogFooter>
