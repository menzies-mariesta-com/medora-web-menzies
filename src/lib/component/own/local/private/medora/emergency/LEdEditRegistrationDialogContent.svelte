<script lang="ts">
	import { page } from '$app/state';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { EdRegistrationDetailRow } from '$lib/model/type/medora/ed-admission.type';
	import type { EdTriageLevelRow } from '$lib/model/type/medora/er/er.type';
	import type { StaffWithRelations } from '$lib/model/type/medora/staff.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { m } from '$lib/paraglide/messages';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	const msg = m as Record<string, (inputs?: object) => string>;

	type Props = DialogSlotProps & {
		visitId: string;
		onSaved?: () => void | Promise<void>;
	};

	let { confirm, cancel, visitId, onSaved }: Props = $props();

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
	let loading = $state(true);
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

	async function load() {
		if (!api) return;
		loading = true;
		try {
			const [detailRes, branchRes, triageRes] = await Promise.all([
				fetch(`${api}?visitId=${encodeURIComponent(visitId)}`, {
					credentials: 'include'
				}),
				branchApi
					? fetch(branchApi, { credentials: 'include' })
					: Promise.resolve(null),
				triageApi
					? fetch(triageApi, { credentials: 'include' })
					: Promise.resolve(null)
			]);
			if (!detailRes.ok) await throwUserFacingHttpError(detailRes);
			const detail = (await detailRes.json()) as EdRegistrationDetailRow;
			if (branchRes?.ok) {
				branches = (await branchRes.json()) as BranchOpt[];
			}
			if (triageRes?.ok) {
				triageLevels = (await triageRes.json()) as EdTriageLevelRow[];
			}
			branchId = detail.branchId ?? '';
			chiefComplaint = detail.chiefComplaint ?? '';
			doctorId = detail.assignedDoctorId ?? '';
			edTriageLevelId =
				detail.edTriageLevelId != null
					? String(detail.edTriageLevelId)
					: '';
			isMlc = detail.isMlc;
			registrationRemarks = detail.registrationRemarks ?? '';
			const d = new Date(detail.arrivedAt);
			if (!Number.isNaN(d.getTime())) {
				d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
				arrivedAtLocal = d.toISOString().slice(0, 16);
			}
		} finally {
			loading = false;
		}
	}

	async function submit(event: Event) {
		event.preventDefault();
		if (submitting || !api) return;
		submitting = true;
		try {
			const res = await fetch(api, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					visitId,
					branchId,
					chiefComplaint: chiefComplaint.trim() || null,
					doctorId: doctorId.trim() || null,
					edTriageLevelId: edTriageLevelId
						? Number(edTriageLevelId)
						: null,
					isMlc,
					registrationRemarks: registrationRemarks.trim() || null,
					arrivedAt: arrivedAtLocal
						? new Date(arrivedAtLocal).toISOString()
						: null
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastService.addToast(
				msg.ed_reg_edit_saved?.() ?? 'Registration updated',
				StatusColorEnum.SUCCESS
			);
			await onSaved?.();
			confirm();
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Update failed',
				StatusColorEnum.ERROR
			);
		} finally {
			submitting = false;
		}
	}

	lifeCycle.onMount(() => {
		void load();
	});
</script>

{#if loading}
	<p class="text-sm">{m.loading?.() ?? 'Loading…'}</p>
{:else}
	<form class="wash-form-stack" onsubmit={submit}>
		<div class="grid gap-3 sm:grid-cols-2">
			<div>
				<label class="label-ink mb-1 block text-sm" for="ed-branch">
					{msg.ed_admission_branch_label?.() ?? 'Branch'}
				</label>
				<WashSelect
					id="ed-branch"
					bind:value={branchId}
					options={branchOptions}
					disabled={submitting}
				/>
			</div>
			<div>
				<label class="label-ink mb-1 block text-sm" for="ed-triage">
					{msg.ed_reg_triage_level_label?.() ?? 'Triage level'}
				</label>
				<WashSelect
					id="ed-triage"
					bind:value={edTriageLevelId}
					options={[{ value: '', label: '—' }, ...triageOptions]}
					disabled={submitting}
				/>
			</div>
		</div>
		<div>
			<label class="label-ink mb-1 block text-sm" for="ed-doctor">
				{msg.ed_reg_doctor_label?.() ?? 'Doctor'}
			</label>
			<SearchSelect
				id="ed-doctor"
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
		<input
			type="datetime-local"
			class="input input-bordered w-full cursor-text"
			bind:value={arrivedAtLocal}
			disabled={submitting}
		/>
		<label class="label cursor-pointer justify-start gap-2">
			<input
				type="checkbox"
				class="checkbox checkbox-primary cursor-pointer"
				bind:checked={isMlc}
				disabled={submitting}
			/>
			<span>{msg.ed_reg_mlc_toggle?.() ?? 'MLC case'}</span>
		</label>
		<textarea
			class="textarea textarea-bordered w-full cursor-text"
			rows="2"
			bind:value={registrationRemarks}
			disabled={submitting}
		></textarea>
		<div class="flex justify-end gap-2">
			<WashButton
				type="button"
				className="btn btn-ghost cursor-pointer"
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
				{m.save?.() ?? 'Save'}
			</WashButton>
		</div>
	</form>
{/if}
