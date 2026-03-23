<script lang="ts">
	import { page } from '$app/state';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { getDoctorStaffList } from '$lib/remote/table/information-table/staff.remote';
	import { getBranchesByHospitalId } from '$lib/remote/table/information-table/hospital-branch.remote';
	import { createReferHistory } from '$lib/remote/table/information-table/refer-history.remote';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiCheckbox from '$lib/component/library/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { YesNoEnum } from '$lib/model/enum/db-link';

	const hospitalId = $derived(page.params.hospital_id);
	const visitId = $derived(VisitState.visitId);
	const toastService = new ToastService();
	const lifeCycle = new LifeCycleUtil();

	let branches = $state<any[]>([]);
	let doctors = $state<any[]>([]);
	let toBranchId = $state('');
	let toReferDoctorId = $state('');
	let subject = $state('');
	let isUrgent = $state(false);
	let referRequestNote = $state('');
	let isSubmitting = $state(false);

	lifeCycle.onMount(async () => {
		if (hospitalId) {
			const branchData = await getBranchesByHospitalId({ hospitalId });
			branches = branchData;
		}
	});

	// Filter doctors based on branch
	$effect(() => {
		if (hospitalId && toBranchId) {
			getDoctorStaffList({ hospitalId, branchId: toBranchId }).then(
				(data) => {
					doctors = data;
					// If current selected doctor is not in the new list, reset it
					if (
						toReferDoctorId &&
						!data.find((d) => String(d.id) === toReferDoctorId)
					) {
						toReferDoctorId = '';
					}
				}
			);
		} else {
			doctors = [];
			toReferDoctorId = '';
		}
	});

	async function handleSubmit() {
		if (!visitId) {
			toastService.addToast(
				'Please select a visit first.',
				StatusColorEnum.WARNING
			);
			return;
		}

		if (!toBranchId) {
			toastService.addToast(
				'Please select a destination branch.',
				StatusColorEnum.WARNING
			);
			return;
		}

		isSubmitting = true;
		try {
			await createReferHistory({
				visitId: parseInt(visitId, 10),
				referDate: new Date().toISOString().split('T')[0],
				toBranchId,
				toReferDoctorId: toReferDoctorId || null,
				subject: subject.trim() || null,
				isUrgent: isUrgent ? YesNoEnum.YES : YesNoEnum.NO,
				referRequestNote
			});
			toastService.addToast(
				'Referral request created successfully.',
				StatusColorEnum.SUCCESS
			);
			// Reset form
			toBranchId = '';
			toReferDoctorId = '';
			subject = '';
			isUrgent = false;
			referRequestNote = '';
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Failed to create referral.',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div
	class="mx-auto mt-4 flex max-w-2xl flex-col gap-4 rounded-lg border border-base-200 bg-base-100 p-4 shadow-sm"
>
	<h2 class="border-b border-base-300 pb-2 text-xl font-bold">
		Refer To Doctor
	</h2>

	{#if !visitId}
		<DaisyUiAlert
			type={StatusColorEnum.INFO}
			message={'Please select a visit first before creating a referral.'}
			className="z-0"
		/>
	{/if}

	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel forText="to-branch" className="shrink-0 sm:w-40"
				>Destination Branch</DaisyUiLabel
			>
			<DaisyUiSelect
				id="to-branch"
				className="d-select flex-1"
				optionHeader="Select a branch..."
				disabled={!visitId}
				bind:value={toBranchId}
			>
				{#each branches as b (b.id)}
					<option value={String(b.id)}>{b.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>

		<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel forText="to-doctor" className="shrink-0 sm:w-40"
				>Destination Doctor</DaisyUiLabel
			>
			<DaisyUiSelect
				id="to-doctor"
				className="d-select flex-1"
				optionHeader={toBranchId
					? 'Select a doctor (optional)...'
					: 'Select a branch first'}
				disabled={!visitId || !toBranchId}
				bind:value={toReferDoctorId}
			>
				{#each doctors as d (d.id)}
					<option value={String(d.id)}
						>{d.firstName} {d.lastName}</option
					>
				{/each}
			</DaisyUiSelect>
		</div>

		<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel forText="refer-subject" className="shrink-0 sm:w-40"
				>Subject</DaisyUiLabel
			>
			<DaisyUiInputField
				id="refer-subject"
				className="flex-1"
				bind:value={subject}
				inputPlaceholderText="Enter referral subject..."
			/>
		</div>

		<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel forText="is-urgent" className="shrink-0 sm:w-40"
				>Urgent</DaisyUiLabel
			>
			<label class="flex cursor-pointer items-center gap-2">
				<DaisyUiCheckbox id="is-urgent" bind:checked={isUrgent} />
				<span class="text-sm">High Priority</span>
			</label>
		</div>

		<div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
			<DaisyUiLabel forText="refer-note" className="shrink-0 sm:w-40"
				>Referral Note</DaisyUiLabel
			>
			<textarea
				id="refer-note"
				class="d-textarea d-textarea-bordered min-h-24 flex-1"
				bind:value={referRequestNote}
				placeholder="Enter referral details..."
			></textarea>
		</div>
	</div>

	<div class="mt-4 flex justify-end">
		<DaisyUiButton
			className="d-btn d-btn-primary w-full sm:w-auto"
			disabled={isSubmitting || !visitId}
			onClick={handleSubmit}
		>
			{isSubmitting ? 'Submitting...' : 'Submit Referral'}
		</DaisyUiButton>
	</div>
</div>