<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { EdTriageLevelRow } from '$lib/model/type/medora/er/er.type';
	import type { PatientWithRelations } from '$lib/model/type/medora/patient.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type { StaffWithRelations } from '$lib/model/type/medora/staff.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const msg = m as Record<string, (inputs?: object) => string>;

	type Props = DialogSlotProps & {
		onCreated?: () => void | Promise<void>;
		/** Prefill patient when opened from a registration row. */
		initialPatientId?: string;
	};

	let { confirm, cancel, onCreated, initialPatientId = '' }: Props =
		$props();

	const lifeCycle = new LifeCycleUtil();
	const toastService = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
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
	const triageApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/er-triage-level?active=1`
			: ''
	);
	const doctorApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/schedule-master/doctor-schedule`
			: ''
	);

	type BranchOpt = { id: string; name: string | null };
	let branches = $state<BranchOpt[]>([]);
	let triageLevels = $state<EdTriageLevelRow[]>([]);
	let patientId = $state('');
	let branchId = $state('');
	let chiefComplaint = $state('');
	let doctorId = $state('');
	let edTriageLevelId = $state('');
	let isMlc = $state(false);
	let arrivedAtLocal = $state('');
	let registrationRemarks = $state('');
	let submitting = $state(false);

	const branchOptions = $derived(
		branches.map((b) => ({ value: b.id, label: b.name ?? b.id }))
	);
	const triageOptions = $derived(
		triageLevels.map((t) => ({
			value: String(t.id),
			label: `${t.level} - ${t.name}`
		}))
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
		const result = (await res.json()) as PaginatedResult<
			PatientWithRelations
		>;
		return (result.data ?? []).map((p) => ({
			label: StringUtil.patientDisplayName(p),
			value: String(p.id)
		}));
	}

	async function getPatientLabelForValue(id: string): Promise<string> {
		if (!patientApi || !id) return '';
		const res = await fetch(
			`${patientApi}?page=1&pageSize=1&search=${encodeURIComponent(id)}`,
			{ credentials: 'include' }
		);
		if (!res.ok) return id;
		const result = (await res.json()) as PaginatedResult<
			PatientWithRelations
		>;
		const p = result.data?.find((x) => String(x.id) === id);
		return p ? StringUtil.patientDisplayName(p) : id;
	}

	async function searchDoctors(
		query: string
	): Promise<{ label: string; value: string }[]> {
		if (!doctorApi) return [];
		const qs = new URLSearchParams({
			mode: 'doctor.paginated',
			page: '1',
			pageSize: String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT),
			search: query.trim()
		});
		const res = await fetch(`${doctorApi}?${qs}`, {
			credentials: 'include'
		});
		if (!res.ok) return [];
		const result = (await res.json()) as PaginatedResult<
			StaffWithRelations
		>;
		return (result.data ?? []).map((s) => ({
			label: StringUtil.doctorOptionDisplayName(s),
			value: String(s.id)
		}));
	}

	async function getDoctorLabel(id: string): Promise<string> {
		if (!doctorApi || !id) return '';
		const res = await fetch(
			`${doctorApi}?mode=doctor.byId&id=${encodeURIComponent(id)}`,
			{ credentials: 'include' }
		);
		if (!res.ok) return id;
		const staff = (await res.json()) as StaffWithRelations | null;
		return staff ? StringUtil.doctorOptionDisplayName(staff) : id;
	}

	async function loadMeta() {
		if (branchApi) {
			const res = await fetch(branchApi, { credentials: 'include' });
			if (res.ok) {
				const data = (await res.json()) as BranchOpt[];
				branches = Array.isArray(data) ? data : [];
				if (!branchId && branches[0]) branchId = branches[0].id;
			}
		}
		if (triageApi) {
			const res = await fetch(triageApi, { credentials: 'include' });
			if (res.ok) triageLevels = (await res.json()) as EdTriageLevelRow[];
		}
		if (!arrivedAtLocal) {
			const d = new Date();
			d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
			arrivedAtLocal = d.toISOString().slice(0, 16);
		}
	}

	async function submit(event: Event) {
		event.preventDefault();
		if (submitting || !api) return;
		if (!patientId.trim() || !branchId.trim()) {
			toastService.addToast(
				msg.ed_admission_select_patient?.() ?? 'Select patient and branch',
				StatusColorEnum.ERROR
			);
			return;
		}
		submitting = true;
		try {
			const arrivedIso = arrivedAtLocal
				? new Date(arrivedAtLocal).toISOString()
				: null;
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'register',
					patientId: patientId.trim(),
					branchId: branchId.trim(),
					chiefComplaint: chiefComplaint.trim() || null,
					doctorId: doctorId.trim() || null,
					edTriageLevelId: edTriageLevelId
						? Number(edTriageLevelId)
						: null,
					isMlc,
					registrationRemarks: registrationRemarks.trim() || null,
					arrivedAt: arrivedIso
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastService.addToast(
				msg.ed_admission_success?.() ?? 'ED visit created',
				StatusColorEnum.SUCCESS
			);
			await onCreated?.();
			confirm();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Create failed',
				StatusColorEnum.ERROR
			);
		} finally {
			submitting = false;
		}
	}

	lifeCycle.onMount(() => {
		if (initialPatientId.trim()) {
			patientId = initialPatientId.trim();
		}
		void loadMeta();
	});
</script>

<form class="flex max-h-[min(80vh,36rem)] flex-col gap-3" onsubmit={submit}>
	<div class="wash-form-stack min-h-0 flex-1 overflow-y-auto">
		<div>
			<label class="label-ink mb-1 block text-sm" for="ce-patient">
				{msg.ed_admission_patient_label?.() ?? 'Patient'}
				<span class="text-error align-top text-sm leading-none" aria-hidden="true"
					>*</span
				>
			</label>
			<SearchSelect
				id="ce-patient"
				bind:value={patientId}
				searchFn={searchPatients}
				resolveLabel={getPatientLabelForValue}
				disabled={submitting}
			/>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label-ink mb-1 block text-sm" for="ce-branch">
					{msg.ed_admission_branch_label?.() ?? 'Branch'}
					<span class="text-error align-top text-sm leading-none" aria-hidden="true"
						>*</span
					>
				</label>
				<WashSelect
					id="ce-branch"
					bind:value={branchId}
					options={branchOptions}
					disabled={submitting}
				/>
			</div>
			<div>
				<label class="label-ink mb-1 block text-sm" for="ce-triage">
					{msg.ed_reg_triage_level_label?.() ?? 'Triage level'}
				</label>
				<WashSelect
					id="ce-triage"
					bind:value={edTriageLevelId}
					options={[{ value: '', label: '—' }, ...triageOptions]}
					disabled={submitting}
				/>
			</div>
		</div>
		<div>
			<label class="label-ink mb-1 block text-sm" for="ce-doctor">
				{msg.ed_reg_doctor_label?.() ?? 'Doctor'}
			</label>
			<SearchSelect
				id="ce-doctor"
				bind:value={doctorId}
				searchFn={searchDoctors}
				resolveLabel={getDoctorLabel}
				disabled={submitting}
			/>
		</div>
		<WashInputField
			label={msg.ed_admission_complaint_label?.() ?? 'Chief complaint'}
			bind:value={chiefComplaint}
			disabled={submitting}
		/>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label-ink mb-1 block text-sm" for="ce-arrived">
					{msg.ed_reg_admission_datetime?.() ?? 'Admission date/time'}
				</label>
				<input
					id="ce-arrived"
					type="datetime-local"
					class="input input-bordered w-full cursor-text"
					bind:value={arrivedAtLocal}
					disabled={submitting}
				/>
			</div>
			<label class="label cursor-pointer justify-start gap-2 pt-8">
				<input
					type="checkbox"
					class="checkbox checkbox-primary cursor-pointer"
					bind:checked={isMlc}
					disabled={submitting}
				/>
				<span>{msg.ed_reg_mlc_toggle?.() ?? 'MLC case'}</span>
			</label>
		</div>
		<div>
			<label class="label-ink mb-1 block text-sm" for="ce-remarks">
				{msg.ed_reg_remarks_label?.() ?? 'Remarks'}
			</label>
			<textarea
				id="ce-remarks"
				class="textarea textarea-bordered w-full cursor-text"
				rows="2"
				bind:value={registrationRemarks}
				disabled={submitting}
			></textarea>
		</div>
	</div>
	<div class="flex shrink-0 justify-end gap-2 border-t border-base-300 pt-3">
		<WashButton
			type="button"
			className="btn btn-ghost cursor-pointer"
			disabled={submitting}
			onClick={() => cancel()}
		>
			{m.cancel?.() ?? 'Cancel'}
		</WashButton>
		<WashButton
			type="submit"
			className="btn btn-primary cursor-pointer"
			loading={submitting}
			disabled={submitting}
			aria-busy={submitting}
		>
			{msg.ed_admission_submit?.() ?? 'Create ER Visit'}
		</WashButton>
	</div>
</form>
