<script lang="ts">
	import { page } from '$app/state';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import type { StaffRegHospitalBranchRow } from '$lib/model/type/medora/staff-reg-ui.type';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import WashCheckbox from '$lib/component/wash/checkbox/WashCheckbox.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { YesNoEnum } from '$lib/model/enum/db-link';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type { StaffWithRelations } from '$lib/model/type/medora/staff.type';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	const BRANCH_ALL = '__all__';

	const hospitalId = $derived(page.params.hospital_id);
	const visitId = $derived(VisitState.visitId);
	const toastService = new ToastService();
	const lifeCycle = new LifeCycleUtil();
	const referDoctorApiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/consultation/cpoe/refer/doctor`
			: ''
	);

	/** From hospital home layout (nav branch). */
	const selectedBranchIdFromLayout = $derived(
		typeof page.data.selectedBranchId === 'string'
			? page.data.selectedBranchId
			: null
	);

	/**
	 * Default destination branch = current branch.
	 * When nav is="All Branches", leave empty (null destination).
	 */
	const defaultDestinationBranchId = $derived(
		selectedBranchIdFromLayout &&
			selectedBranchIdFromLayout !== BRANCH_ALL
			? selectedBranchIdFromLayout
			: ''
	);

	let branches = $state<StaffRegHospitalBranchRow[]>([]);
	/** Tracks destination branch so we clear doctor when branch changes */
	let lastDestinationBranchId = $state('');
	let toBranchId = $state('');
	let toReferDoctorId = $state('');
	let subject = $state('');
	let isUrgent = $state(false);
	let referRequestNote = $state('');
	let isSubmitting = $state(false);
	let branchDefaultApplied = $state(false);

	async function fetchBranchesAll(hid: string) {
		const res = await fetch(
			`/api/medora/hospital/${hid}/home/administration/branches?mode=all`,
			{ method: 'GET' }
		);
		if (!res.ok) {
			throw new Error(`Failed to load branches (${res.status})`);
		}
		return (await res.json()) as StaffRegHospitalBranchRow[];
	}

	lifeCycle.onMount(async () => {
		if (hospitalId) {
			branches = await fetchBranchesAll(String(hospitalId));
		}
	});

	// Pre-select destination branch from nav (unless="All Branches")
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
		const url = new URL(referDoctorApiBase, window.location.origin);
		url.searchParams.set('mode', 'doctor.search');
		url.searchParams.set('search', query.trim());
		url.searchParams.set('branchId', toBranchId.trim());
		url.searchParams.set('page', '1');
		url.searchParams.set(
			'pageSize',
			String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT)
		);
		const r = await fetch(url.toString(), { method: 'GET' });
		if (!r.ok)
			throw new Error(`Failed to search doctors (${r.status})`);
		const res =
			(await r.json()) as PaginatedResult<StaffWithRelations>;
		return (res.data ?? []).map((staff) => ({
			label: StringUtil.doctorOptionDisplayName(staff),
			value: String(staff.id)
		}));
	}

	async function getDestinationDoctorLabelForValue(
		id: string
	): Promise<string> {
		const url = new URL(referDoctorApiBase, window.location.origin);
		url.searchParams.set('mode', 'doctor.get');
		url.searchParams.set('id', id);
		const r = await fetch(url.toString(), { method: 'GET' });
		if (!r.ok) throw new Error(`Failed to load doctor (${r.status})`);
		const staff = (await r.json()) as StaffWithRelations | null;
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
			toastService.addToast(
				'Subject is required.',
				StatusColorEnum.WARNING
			);
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
			const r = await fetch(referDoctorApiBase, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					mode: 'referHistory.create',
					payload: {
						visitId: parseInt(visitId, 10),
						referAt: new Date().toISOString(),
						toBranchId: toBranchId.trim(),
						toReferDoctorId: toReferDoctorId.trim(),
						subject: subject.trim(),
						isUrgent: isUrgent ? YesNoEnum.YES : YesNoEnum.NO,
						referRequestNote: referRequestNote.trim()
					}
				})
			});
			if (!r.ok) {
				throw new Error(`Failed to create referral (${r.status})`);
			}
			toastSuccess(
				toastService,
				m.entity_referral(),
				m.toast_action_created()
			);
			// Reset form (re-apply default branch when not="All Branches")
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
		<WashAlert
			type={StatusColorEnum.INFO}
			message="Please select a visit first before creating a referral."
			className="z-0"
		/>
	{/if}

	<div class="flex flex-col gap-4">
		<div
			class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="to-branch" class="shrink-0 sm:w-40">
				Destination Branch <span class="text-error">*</span>
			</label>
			<WashSelect
				id="to-branch"
				className="select flex-1"
				optionHeader="Select branch…"
				disabled={!visitId}
				bind:value={toBranchId}
			>
				<option value="" disabled>— Select branch —</option>
				{#each branches as b (b.id)}
					<option value={String(b.id)}>{b.name}</option>
				{/each}
			</WashSelect>
		</div>

		<div
			class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="to-doctor-search" class="shrink-0 sm:w-40">
				Destination Doctor <span class="text-error">*</span>
			</label>
			<div class="min-w-0 flex-1">
				<SearchSelect
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

		<div
			class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="refer-subject" class="shrink-0 sm:w-40">
				Subject <span class="text-error">*</span>
			</label>
			<WashInputField
				id="refer-subject"
				className="flex-1"
				required={true}
				bind:value={subject}
				inputPlaceholderText="Enter referral subject…"
			/>
		</div>

		<div
			class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="is-urgent" class="shrink-0 sm:w-40">Urgent</label>
			<label class="flex cursor-pointer items-center gap-2">
				<WashCheckbox id="is-urgent" bind:checked={isUrgent} />
				<span class="text-sm">High Priority</span>
			</label>
		</div>

		<div
			class="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
		>
			<label for="refer-note" class="shrink-0 sm:w-40">
				Referral note <span class="text-error">*</span>
			</label>
			<textarea
				id="refer-note"
				class="textarea-bordered textarea min-h-24 flex-1"
				bind:value={referRequestNote}
				required
				placeholder="Enter referral details…"
			></textarea>
		</div>
	</div>

	<div class="mt-4 flex justify-end">
		<WashButton
			className="btn btn-primary w-full sm:w-auto"
			disabled={isSubmitting || !isFormComplete}
			onClick={handleSubmit}
		>
			{isSubmitting ? 'Submitting...' : 'Submit Referral'}
		</WashButton>
	</div>
</div>
