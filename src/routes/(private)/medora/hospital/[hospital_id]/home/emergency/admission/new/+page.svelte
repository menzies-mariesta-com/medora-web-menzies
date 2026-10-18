<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashCardBodyAction from '$lib/component/wash/card/body/action/WashCardBodyAction.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import type { AdtSourceOpdVisitRow } from '$lib/model/type/medora/ipd/ipd.type';
	import type { PatientWithRelations } from '$lib/model/type/medora/patient.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import {
		ensureTwoFactorForMutation,
		redirectIfTwoFactorRequired
	} from '$lib/util/two-factor-gate.util';
	import { m } from '$lib/paraglide/messages';

	const msg = m as Record<string, (inputs?: object) => string>;
	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	const layoutData = $derived(
		page.data as {
			userRoleId?: number | null;
			twoFactorEnabled?: boolean;
		}
	);

	async function requireMutationTwoFactor(): Promise<boolean> {
		return ensureTwoFactorForMutation({
			userRoleId: layoutData?.userRoleId ?? null,
			twoFactorEnabled: Boolean(layoutData?.twoFactorEnabled)
		});
	}

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const patientIdFromUrl = $derived(
		page.url.searchParams.get('patientId')?.trim() ?? ''
	);
	const sourceOpdFromUrl = $derived(
		page.url.searchParams.get('sourceOpdVisitId')?.trim() ?? ''
	);

	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/emergency/admission`
			: ''
	);
	const branchApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/branches`
			: ''
	);
	const patientApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/registration/patient/list`
			: ''
	);

	type BranchOpt = { id: string; name: string | null };
	let branches = $state<BranchOpt[]>([]);
	let sourceOpdVisits = $state<AdtSourceOpdVisitRow[]>([]);
	let patientId = $state('');
	let branchId = $state('');
	let sourceOpdVisitId = $state('');
	let chiefComplaint = $state('');
	let isSubmitting = $state(false);
	let loadingSource = $state(false);
	let urlPrefillDone = $state(false);

	const branchOptions = $derived(
		branches.map((b) => ({
			value: b.id,
			label: b.name ?? b.id
		}))
	);
	const sourceOpdOptions = $derived(
		sourceOpdVisits.map((v) => ({
			value: String(v.visitId),
			label: `${v.visitNo ?? `#${v.visitId}`}${
				v.hasOpenOpBill ? ' (open OP bill)' : ''
			}`
		}))
	);
	const selectedSource = $derived(
		sourceOpdVisits.find(
			(v) => String(v.visitId) === sourceOpdVisitId
		) ?? null
	);

	async function searchPatients(
		query: string
	): Promise<{ label: string; value: string }[]> {
		if (!patientApi) return [];
		const qs = new URLSearchParams({
			page: '1',
			pageSize: String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT)
		});
		if (query.trim()) qs.set('search', query.trim());
		const res = await fetch(`${patientApi}?${qs}`, {
			credentials: 'include'
		});
		if (!res.ok) return [];
		const result =
			(await res.json()) as PaginatedResult<PatientWithRelations>;
		return (result.data ?? []).map((p) => ({
			label: StringUtil.patientOptionDisplayName(p),
			value: String(p.id)
		}));
	}

	async function getPatientLabelForValue(id: string): Promise<string> {
		if (!patientApi || !id) return '';
		const res = await fetch(
			`${patientApi}?id=${encodeURIComponent(id)}`,
			{ credentials: 'include' }
		);
		if (!res.ok) return '';
		const p = (await res.json()) as PatientWithRelations | null;
		if (!p) return '';
		return StringUtil.patientOptionDisplayName(p);
	}

	async function loadBranches() {
		if (!branchApi) return;
		const res = await fetch(`${branchApi}?mode=all`, {
			credentials: 'include'
		});
		if (res.ok) {
			branches = (await res.json()) as BranchOpt[];
			if (!branchId && branches[0]?.id) branchId = branches[0].id;
		}
	}

	async function loadSourceOpdVisits(pid: string) {
		sourceOpdVisits = [];
		if (!sourceOpdFromUrl) sourceOpdVisitId = '';
		if (!api || !pid.trim()) return;
		loadingSource = true;
		try {
			const qs = new URLSearchParams({
				mode: 'source-opd',
				patientId: pid.trim()
			});
			const res = await fetch(`${api}?${qs}`, {
				credentials: 'include'
			});
			if (!res.ok) return;
			const list = (await res.json()) as AdtSourceOpdVisitRow[];
			sourceOpdVisits = list ?? [];
			if (sourceOpdFromUrl) {
				const match = sourceOpdVisits.some(
					(v) => String(v.visitId) === sourceOpdFromUrl
				);
				if (match) sourceOpdVisitId = sourceOpdFromUrl;
			} else if (sourceOpdVisits.length > 0) {
				sourceOpdVisitId = String(sourceOpdVisits[0].visitId);
			}
		} finally {
			loadingSource = false;
		}
	}

	$effect(() => {
		const pid = patientId;
		void loadSourceOpdVisits(pid);
	});

	$effect(() => {
		if (urlPrefillDone || !patientIdFromUrl) return;
		patientId = patientIdFromUrl;
		urlPrefillDone = true;
	});

	async function handleRegister(e: Event) {
		e.preventDefault();
		if (isSubmitting || !api) return;
		if (!(await requireMutationTwoFactor())) return;
		if (!patientId.trim()) {
			toastService.addToast(
				msg.ed_admission_select_patient?.() ??
					'Select a registered patient',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!branchId.trim()) {
			toastService.addToast(
				msg.ed_admission_select_branch?.() ?? 'Select a branch',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (sourceOpdVisits.length > 0 && !sourceOpdVisitId) {
			toastService.addToast(
				msg.ed_admission_select_opd?.() ??
					'Select the OPD visit to link',
				StatusColorEnum.ERROR
			);
			return;
		}

		if (selectedSource?.hasOpenOpBill) {
			const confirm = await dialogService.open({
				title: msg.ed_admission_open_op_bill_title?.() ?? 'Open OP bill',
				message:
					msg.ed_admission_open_op_bill_message?.() ??
					'This OPD visit has an open OP bill. Register in ED anyway? The OP bill stays open to settle later.',
				variant: DialogVariantEnum.CONFIRM
			});
			if (!confirm.confirmed) return;
		}

		isSubmitting = true;
		try {
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'register',
					patientId: patientId.trim(),
					branchId: branchId.trim(),
					chiefComplaint: chiefComplaint.trim() || null,
					sourceOpdVisitId: sourceOpdVisitId
						? sourceOpdVisitId
						: null
				})
			});
			if (!res.ok) {
				if (
					await redirectIfTwoFactorRequired(res, {
						twoFactorEnabled: Boolean(layoutData?.twoFactorEnabled)
					})
				) {
					return;
				}
				await throwUserFacingHttpError(res);
			}
			const data = (await res.json()) as { visitId?: string };
			toastService.addToast(
				msg.ed_admission_success?.() ??
					'Patient registered in ED (new visit created)',
				StatusColorEnum.SUCCESS
			);
			if (hospitalId && data.visitId) {
				routerUtil.replaceRoute(
					`${medoraHospitalPageUrl(
						hospitalId,
						WebRoutesEnum.MEDORA_HOME_NURSING_WORKBENCH_ED_TRIAGE
					)}?visitId=${encodeURIComponent(data.visitId)}`
				);
			}
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : 'Registration failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		void loadBranches();
	});
</script>

<div class="space-y-6 p-4">
	<WashCard>
		<WashCardBody>
			<form onsubmit={handleRegister} class="space-y-4">
				<WashCardBodyTitle>
					{msg.ed_admission_new_title?.() ?? 'New ED registration'}
				</WashCardBodyTitle>
				<p class="text-sm opacity-70">
					{msg.ed_admission_new_hint?.() ??
						'Requires a registered patient. Creates a new ED visit and adds the patient to the track board (waiting triage). Link an unfinished OPD visit when the patient came from outpatient.'}
				</p>
				<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					<div class="md:col-span-2">
						<label class="label-ink mb-1 block text-sm" for="ed-patient">
							{msg.ed_admission_patient_label?.() ?? 'Patient'}
							<span
								class="text-error align-top text-sm leading-none"
								aria-hidden="true">*</span
							>
						</label>
						<SearchSelect
							id="ed-patient"
							bind:value={patientId}
							placeholder={msg.ed_admission_patient_placeholder?.() ??
								'Search patient'}
							searchFn={searchPatients}
							resolveLabel={getPatientLabelForValue}
							disabled={isSubmitting}
						/>
					</div>
					<div>
						<label class="label-ink mb-1 block text-sm" for="ed-branch">
							{msg.ed_admission_branch_label?.() ?? 'Branch'}
							<span
								class="text-error align-top text-sm leading-none"
								aria-hidden="true">*</span
							>
						</label>
						<WashSelect
							id="ed-branch"
							placeholder={msg.ed_admission_branch_placeholder?.() ??
								'Select branch'}
							options={branchOptions}
							bind:value={branchId}
						/>
					</div>
					{#if sourceOpdVisits.length > 0}
						<div class="md:col-span-2">
							<label class="label-ink mb-1 block text-sm" for="ed-source-opd">
								{msg.ed_admission_source_opd_label?.() ??
									'Link OPD visit'}
								<span
									class="text-error align-top text-sm leading-none"
									aria-hidden="true">*</span
								>
							</label>
							<WashSelect
								id="ed-source-opd"
								options={sourceOpdOptions}
								bind:value={sourceOpdVisitId}
								disabled={loadingSource || isSubmitting}
							/>
						</div>
					{/if}
					<div class="md:col-span-2 xl:col-span-3">
						<label class="label-ink mb-1 block text-sm" for="ed-complaint">
							{msg.ed_admission_complaint_label?.() ?? 'Chief complaint'}
						</label>
						<WashInputField
							id="ed-complaint"
							bind:value={chiefComplaint}
							inputPlaceholderText={msg.ed_admission_complaint_placeholder?.() ??
								'Optional'}
						/>
					</div>
				</div>
				<WashCardBodyAction>
					<WashButton
						type="submit"
						variant="primary"
						className="cursor-pointer"
						disabled={isSubmitting || loadingSource}
						loading={isSubmitting}
						aria-busy={isSubmitting}
					>
						{msg.ed_admission_submit?.() ?? 'Register in ED'}
					</WashButton>
				</WashCardBodyAction>
			</form>
		</WashCardBody>
	</WashCard>
</div>
