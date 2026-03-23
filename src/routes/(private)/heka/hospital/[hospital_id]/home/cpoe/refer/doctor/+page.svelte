<script lang="ts">
	import { page } from '$app/state';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import {
		getDoctorStaffPaginated,
		getStaffByIdWithRelations
	} from '$lib/remote/table/information-table/staff.remote';
	import { getBranchesByHospitalId } from '$lib/remote/table/information-table/hospital-branch.remote';
	import { createReferHistory } from '$lib/remote/table/information-table/refer-history.remote';
	import type { HospitalBranchSchema } from '$lib/server/db/schema-type';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import DaisyUiAlert from '$lib/component/library/daisyui/alert/DaisyUiAlert.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiSearchSelect from '$lib/component/library/daisyui/search-select/DaisyUISearchSelect.svelte';
	import DaisyUiCheckbox from '$lib/component/library/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { YesNoEnum } from '$lib/model/enum/db-link';

	const BRANCH_ALL = '__all__';

	const hospitalId = $derived(page.params.hospital_id);
	const visitId = $derived(VisitState.visitId);
	const toastService = new ToastService();
	const lifeCycle = new LifeCycleUtil();

	/** From hospital home layout (nav branch). */
	const selectedBranchIdFromLayout = $derived(
		typeof page.data.selectedBranchId === 'string'
			? page.data.selectedBranchId
			: null
	);

	/**
	 * Default destination branch = current branch.
	 * When nav is "All Branches", leave empty (null destination).
	 */
	const defaultDestinationBranchId = $derived(
		selectedBranchIdFromLayout &&
			selectedBranchIdFromLayout !== BRANCH_ALL
			? selectedBranchIdFromLayout
			: ''
	);

	let branches = $state<HospitalBranchSchema[]>([]);
	/** Tracks destination branch so we clear doctor when branch changes */
	let lastDestinationBranchId = $state('');
	let toBranchId = $state('');
	let toReferDoctorId = $state('');
	let subject = $state('');
	let isUrgent = $state(false);
	let referRequestNote = $state('');
	let isSubmitting = $state(false);
	let branchDefaultApplied = $state(false);

	lifeCycle.onMount(async () => {
		if (hospitalId) {
			const branchData = await getBranchesByHospitalId({ hospitalId });
			branches = branchData;
		}
	});

	// Pre-select destination branch from nav (unless "All Branches")
	$effect(() => {
		if (branchDefaultApplied || branches.length === 0) return;
		if (defaultDestinationBranchId) {
			const ok = branches.some(
				(b) => String(b.id) === defaultDestinationBranchId
			);
			if (ok) {
				toBranchId = defaultDestinationBranchId;
			}
		}
		branchDefaultApplied = true;
	});

	// Clear destination doctor when branch changes (doctors are branch-scoped)
	$effect(() => {
		const b = toBranchId?.trim() ?? '';
		if (b !== lastDestinationBranchId) {
			lastDestinationBranchId = b;
			toReferDoctorId = '';
		}
	});

	async function searchDestinationDoctors(
		query: string
	): Promise<{ label: string; value: string }[]> {
		if (!hospitalId || !toBranchId?.trim()) return [];
		const res = await getDoctorStaffPaginated({
			search: query.trim(),
			hospitalId,
			branchId: toBranchId.trim(),
			page: 1,
			pageSize: AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT
		});
		return res.data.map((staff) => ({
			label: StringUtil.doctorOptionDisplayName(staff),
			value: String(staff.id)
		}));
	}

	async function getDestinationDoctorLabelForValue(
		id: string
	): Promise<string> {
		const staff = await getStaffByIdWithRelations({ id });
		if (!staff) return '';
		return StringUtil.doctorOptionDisplayName(staff);
	}

	const isFormComplete = $derived(
		!!visitId &&
			!!toBranchId?.trim() &&
			!!toReferDoctorId?.trim() &&
			subject.trim().length > 0 &&
			referRequestNote.trim().length > 0
	);

	async function handleSubmit() {
		if (!visitId) {
			toastService.addToast(
				'Please select a visit first.',
				StatusColorEnum.WARNING
			);
			return;
		}
		if (!toBranchId?.trim()) {
			toastService.addToast(
				'Destination branch is required.',
				StatusColorEnum.WARNING
			);
			return;
		}
		if (!toReferDoctorId?.trim()) {
			toastService.addToast(
				'Destination doctor is required.',
				StatusColorEnum.WARNING
			);
			return;
		}
		if (!subject.trim()) {
			toastService.addToast('Subject is required.', StatusColorEnum.WARNING);
			return;
		}
		if (!referRequestNote.trim()) {
			toastService.addToast(
				'Referral note is required.',
				StatusColorEnum.WARNING
			);
			return;
		}

		isSubmitting = true;
		try {
			await createReferHistory({
				visitId: parseInt(visitId, 10),
				referDate: new Date().toISOString().split('T')[0],
				toBranchId: toBranchId.trim(),
				toReferDoctorId: toReferDoctorId.trim(),
				subject: subject.trim(),
				isUrgent: isUrgent ? YesNoEnum.YES : YesNoEnum.NO,
				referRequestNote: referRequestNote.trim()
			});
			toastService.addToast(
				'Referral request created successfully.',
				StatusColorEnum.SUCCESS
			);
			// Reset form (re-apply default branch when not "All Branches")
			toBranchId = defaultDestinationBranchId || '';
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
			message="Please select a visit first before creating a referral."
			className="z-0"
		/>
	{/if}

	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel forText="to-branch" className="shrink-0 sm:w-40">
				Destination Branch <span class="text-error">*</span>
			</DaisyUiLabel>
			<DaisyUiSelect
				id="to-branch"
				className="d-select flex-1"
				optionHeader="Select branch…"
				disabled={!visitId}
				bind:value={toBranchId}
			>
				<option value="" disabled>— Select branch —</option>
				{#each branches as b (b.id)}
					<option value={String(b.id)}>{b.name}</option>
				{/each}
			</DaisyUiSelect>
		</div>

		<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel forText="to-doctor-search" className="shrink-0 sm:w-40">
				Destination Doctor <span class="text-error">*</span>
			</DaisyUiLabel>
			<div class="min-w-0 flex-1">
				<DaisyUiSearchSelect
					bind:value={toReferDoctorId}
					placeholder="Search or select doctor…"
					className="w-full"
					disabled={!visitId || !toBranchId?.trim()}
					searchFn={searchDestinationDoctors}
					getLabelForValue={getDestinationDoctorLabelForValue}
					minSearchLength={0}
				/>
			</div>
		</div>

		<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
			<DaisyUiLabel forText="refer-subject" className="shrink-0 sm:w-40">
				Subject <span class="text-error">*</span>
			</DaisyUiLabel>
			<DaisyUiInputField
				id="refer-subject"
				className="flex-1"
				required={true}
				bind:value={subject}
				inputPlaceholderText="Enter referral subject…"
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
			<DaisyUiLabel forText="refer-note" className="shrink-0 sm:w-40">
				Referral note <span class="text-error">*</span>
			</DaisyUiLabel>
			<textarea
				id="refer-note"
				class="d-textarea d-textarea-bordered min-h-24 flex-1"
				bind:value={referRequestNote}
				required
				placeholder="Enter referral details…"
			></textarea>
		</div>
	</div>

	<div class="mt-4 flex justify-end">
		<DaisyUiButton
			className="d-btn d-btn-primary w-full sm:w-auto"
			disabled={isSubmitting || !isFormComplete}
			onClick={handleSubmit}
		>
			{isSubmitting ? 'Submitting...' : 'Submit Referral'}
		</DaisyUiButton>
	</div>
</div>