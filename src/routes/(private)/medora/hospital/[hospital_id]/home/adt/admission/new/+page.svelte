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
	import {
		CareSettingEnum,
		careSettingLabel,
		parseCareSetting
	} from '$lib/model/enum/care-setting.enum';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import {
		medoraHospitalPageUrl,
		WebRoutesEnum
	} from '$lib/model/enum/routes.enum';
	import type {
		AdtSourceOpdVisitRow,
		BedRow,
		IpdAdmissionOrderRow,
		WardRow
	} from '$lib/model/type/medora/ipd/ipd.type';
	import type { EdTriageLevelRow } from '$lib/model/type/medora/er/er.type';
	import type { PatientWithRelations } from '$lib/model/type/medora/patient.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type { StaffWithRelations } from '$lib/model/type/medora/staff.type';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { RouterUtil } from '$lib/util/router.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { PageActionEnum } from '$lib/model/enum/page-action.enum';
	import { can } from '$lib/state/page-permission.state.svelte';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();
	const routerUtil = new RouterUtil();

	const CARE_SETTING_OPTIONS = [
		CareSettingEnum.IPD,
		CareSettingEnum.ED,
		CareSettingEnum.ICU,
		CareSettingEnum.OT
	].map((value) => ({ value, label: careSettingLabel(value) }));

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string'
			? page.params.hospital_id
			: ''
	);
	const orderIdFromUrl = $derived(
		(() => {
			const raw = page.url.searchParams.get('orderId');
			const n = raw ? Number(raw) : NaN;
			return Number.isFinite(n) && n > 0 ? n : null;
		})()
	);
	const patientIdFromUrl = $derived(
		page.url.searchParams.get('patientId')?.trim() ?? ''
	);
	const careSettingFromUrl = $derived(
		parseCareSetting(page.url.searchParams.get('careSetting'))
	);
	const api = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/admission`
			: ''
	);
	const orderApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/adt/admission-order`
			: ''
	);
	const wardApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/ward-master?active=1`
			: ''
	);
	const bedApi = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/administration/bed-master`
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

	let careSetting = $state<CareSettingEnum>(CareSettingEnum.IPD);
	let wards = $state<WardRow[]>([]);
	let beds = $state<BedRow[]>([]);
	let triageLevels = $state<EdTriageLevelRow[]>([]);
	let sourceOpdVisits = $state<AdtSourceOpdVisitRow[]>([]);
	let patientId = $state('');
	let sourceOpdVisitId = $state('');
	let wardId = $state('');
	let bedId = $state('');
	let reasonNotes = $state('');
	let admissionOrderId = $state<number | null>(null);
	let orderingDoctorId = $state<string | null>(null);
	let orderLocked = $state(false);
	let isSubmitting = $state(false);
	let loadingSource = $state(false);
	let loadingOrder = $state(false);
	let urlPrefillDone = $state(false);

	// ED-only fields
	let chiefComplaint = $state('');
	let doctorId = $state('');
	let edTriageLevelId = $state('');
	let isMlc = $state(false);
	let arrivedAtLocal = $state('');
	let registrationRemarks = $state('');

	const isEd = $derived(careSetting === CareSettingEnum.ED);

	const selectedWard = $derived(
		wards.find((w) => String(w.id) === wardId) ?? null
	);
	const branchId = $derived(selectedWard?.branchId ?? '');

	const selectedSource = $derived(
		sourceOpdVisits.find(
			(v) => String(v.visitId) === sourceOpdVisitId
		) ?? null
	);

	const wardOptions = $derived(
		wards.map((w) => ({
			value: String(w.id),
			label: w.code ? `${w.name} (${w.code})` : w.name
		}))
	);
	const bedOptions = $derived(
		beds.map((b) => ({
			value: String(b.id),
			label: b.code ? `${b.name} (${b.code})` : b.name
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
	const triageOptions = $derived(
		triageLevels.map((t) => ({
			value: String(t.id),
			label: `${t.level} - ${t.name}`
		}))
	);
	const newPatientUrl = $derived(
		hospitalId
			? `${medoraHospitalPageUrl(
					hospitalId,
					WebRoutesEnum.MEDORA_HOME_REGISTRATION_PATIENT_REGISTRATION
				)}?returnTo=${encodeURIComponent(
					`${medoraHospitalPageUrl(
						hospitalId,
						WebRoutesEnum.MEDORA_HOME_ADT_ADMISSION_NEW
					)}?careSetting=${careSetting}`
				)}`
			: ''
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

	async function getPatientLabelForValue(
		id: string
	): Promise<string> {
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
		const result =
			(await res.json()) as PaginatedResult<StaffWithRelations>;
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

	async function loadWards() {
		if (!wardApi) return;
		const res = await fetch(
			`${wardApi}&scope=${careSetting.toLowerCase()}`,
			{ credentials: 'include' }
		);
		wards = res.ok ? ((await res.json()) as WardRow[]) : [];
	}

	async function loadTriageLevels() {
		if (!triageApi) return;
		const res = await fetch(triageApi, { credentials: 'include' });
		if (res.ok)
			triageLevels = (await res.json()) as EdTriageLevelRow[];
	}

	async function loadFreeBeds(
		wid: number,
		opts?: { signal?: AbortSignal; isCancelled?: () => boolean }
	) {
		if (!bedApi || !wid) {
			beds = [];
			return;
		}
		const qs = new URLSearchParams({
			free: '1',
			wardId: String(wid),
			scope: careSetting.toLowerCase()
		});
		const res = await fetch(`${bedApi}?${qs}`, {
			credentials: 'include',
			signal: opts?.signal
		});
		beds = res.ok ? ((await res.json()) as BedRow[]) : [];
	}

	async function loadSourceOpdVisits(
		pid: string,
		opts?: { signal?: AbortSignal; isCancelled?: () => boolean }
	) {
		if (orderLocked) return;
		sourceOpdVisits = [];
		sourceOpdVisitId = '';
		if (!api || !pid.trim()) return;
		loadingSource = true;
		try {
			const qs = new URLSearchParams({
				mode: 'source-opd',
				patientId: pid.trim()
			});
			const res = await fetch(`${api}?${qs}`, {
				credentials: 'include',
				signal: opts?.signal
			});
			if (!res.ok) return;
			const list = (await res.json()) as AdtSourceOpdVisitRow[];
			sourceOpdVisits = list ?? [];
			if (sourceOpdVisits.length > 0) {
				sourceOpdVisitId = String(sourceOpdVisits[0].visitId);
			}
		} finally {
			loadingSource = false;
		}
	}

	async function loadAdmissionOrder(
		orderId: number,
		opts?: { signal?: AbortSignal; isCancelled?: () => boolean }
	) {
		if (!orderApi) return;
		loadingOrder = true;
		try {
			const res = await fetch(
				`${orderApi}?id=${encodeURIComponent(String(orderId))}`,
				{ credentials: 'include', signal: opts?.signal }
			);
			if (!res.ok) await throwUserFacingHttpError(res);
			const order = (await res.json()) as IpdAdmissionOrderRow;
			admissionOrderId = order.id;
			orderLocked = true;
			patientId = order.patientId;
			orderingDoctorId = order.orderingDoctorId ?? null;
			sourceOpdVisitId = String(order.sourceVisitId);
			sourceOpdVisits = [
				{
					visitId: order.sourceVisitId,
					visitNo: order.sourceVisitNo,
					hasOpenOpBill: false
				}
			];
			if (order.preferredWardId) {
				wardId = String(order.preferredWardId);
			}
			if (order.notes) reasonNotes = order.notes;
		} catch (e) {
			if (e instanceof DOMException && e.name === 'AbortError')
				return;
			if (opts?.isCancelled?.()) return;
			toastService.addToast(
				e instanceof Error ? e.message : 'Failed to load order',
				StatusColorEnum.ERROR
			);
		} finally {
			loadingOrder = false;
		}
	}

	$effect(() => {
		// Reload the ward list for the chosen care setting; clear dependent picks.
		const setting = careSetting;
		void setting;
		wardId = '';
		bedId = '';
		wards = [];
		void loadWards();
	});

	$effect(() => {
		const wid = Number(wardId);
		bedId = '';
		let cancelled = false;
		const ac = new AbortController();
		if (Number.isFinite(wid) && wid > 0) {
			void loadFreeBeds(wid, {
				signal: ac.signal,
				isCancelled: () => cancelled
			});
		} else beds = [];
		return () => {
			cancelled = true;
			ac.abort();
		};
	});

	$effect(() => {
		const pid = patientId;
		let cancelled = false;
		const ac = new AbortController();
		if (!orderLocked) {
			void loadSourceOpdVisits(pid, {
				signal: ac.signal,
				isCancelled: () => cancelled
			});
		}
		return () => {
			cancelled = true;
			ac.abort();
		};
	});

	$effect(() => {
		const oid = orderIdFromUrl;
		if (oid == null || admissionOrderId === oid) return;

		let cancelled = false;
		const ac = new AbortController();
		void loadAdmissionOrder(oid, {
			signal: ac.signal,
			isCancelled: () => cancelled
		});
		return () => {
			cancelled = true;
			ac.abort();
		};
	});

	$effect(() => {
		if (urlPrefillDone) return;
		if (patientIdFromUrl) patientId = patientIdFromUrl;
		if (careSettingFromUrl) careSetting = careSettingFromUrl;
		if (patientIdFromUrl || careSettingFromUrl) urlPrefillDone = true;
	});

	async function handleAdmit(e: Event) {
		e.preventDefault();
		if (isSubmitting || !api) return;
		if (!patientId.trim()) {
			toastService.addToast(
				'Select a registered patient',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!branchId || !wardId || !bedId) {
			toastService.addToast(
				'Select ward and free bed',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (sourceOpdVisits.length > 0 && !sourceOpdVisitId) {
			toastService.addToast(
				'Select the OPD visit to admit from',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (isEd && !doctorId.trim()) {
			toastService.addToast(
				'Select the attending doctor',
				StatusColorEnum.ERROR
			);
			return;
		}

		if (selectedSource?.hasOpenOpBill) {
			const confirm = await dialogService.open({
				title: 'Open OP bill',
				message: `This OPD visit has an open OP bill. Admit to ${careSettingLabel(careSetting)} anyway? The OP bill stays open to settle later.`,
				variant: DialogVariantEnum.CONFIRM
			});
			if (!confirm.confirmed) return;
		}

		isSubmitting = true;
		try {
			const arrivedIso = arrivedAtLocal
				? new Date(arrivedAtLocal).toISOString()
				: null;
			const res = await fetch(api, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					action: 'admit',
					careSetting,
					patientId: patientId.trim(),
					branchId,
					wardId: Number(wardId),
					bedId: Number(bedId),
					reasonNotes: reasonNotes.trim() || null,
					sourceVisitId: sourceOpdVisitId || null,
					admissionOrderId,
					admittingDoctorId: isEd ? null : orderingDoctorId,
					...(isEd
						? {
								chiefComplaint: chiefComplaint.trim() || null,
								doctorId: doctorId.trim(),
								edTriageLevelId: edTriageLevelId
									? Number(edTriageLevelId)
									: null,
								isMlc,
								registrationRemarks:
									registrationRemarks.trim() || null,
								arrivedAt: arrivedIso
							}
						: {})
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			toastService.addToast(
				isEd
					? 'Patient registered in ED'
					: `Patient admitted (${careSettingLabel(careSetting)})`,
				StatusColorEnum.SUCCESS
			);
			if (hospitalId) {
				routerUtil.replaceRoute(
					medoraHospitalPageUrl(
						hospitalId,
						WebRoutesEnum.MEDORA_HOME_ADT_ADMISSION_LIST
					)
				);
			}
		} catch (err) {
			toastService.addToast(
				err instanceof Error ? err.message : 'Admit failed',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		if (!arrivedAtLocal) {
			const d = new Date();
			d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
			arrivedAtLocal = d.toISOString().slice(0, 16);
		}
		void loadTriageLevels();
	});
</script>

<div class="space-y-6">
	<WashCard>
		<WashCardBody>
			<form onsubmit={handleAdmit} class="space-y-4">
				<WashCardBodyTitle>New Admission</WashCardBodyTitle>
				<p class="text-sm opacity-70">
					{#if orderLocked}
						Fulfilling pending admission order #{admissionOrderId}.
						Assign a bed to admit.
					{:else}
						Pick the care setting first. IPD, ICU and OT create an
						inpatient visit; ED creates an emergency visit on the
						track board. A registered patient is required.
					{/if}
				</p>
				{#if loadingOrder}
					<p class="text-sm opacity-70">Loading admission order…</p>
				{/if}
				<div
					class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
				>
					<div>
						<label
							class="label-ink mb-1 block text-sm"
							for="adm-care-setting"
							>Care setting <span class="text-error">*</span></label
						>
						<WashSelect
							id="adm-care-setting"
							options={CARE_SETTING_OPTIONS}
							bind:value={careSetting}
							disabled={orderLocked}
						/>
					</div>
					<div>
						<label
							for="a11y-page-d34360"
							class="label-ink mb-1 block text-sm"
							>Patient <span class="text-error">*</span></label
						>
						<SearchSelect
							bind:value={patientId}
							placeholder="Search registered patient"
							className="w-full"
							searchFn={searchPatients}
							getLabelForValue={getPatientLabelForValue}
							minSearchLength={0}
							disabled={orderLocked}
							inputId="a11y-page-d34360"
						/>
						{#if newPatientUrl}
							<WashButton
								type="button"
								variant="link"
								className="mt-1 h-auto min-h-0 p-0 text-xs"
								onClick={() => routerUtil.replaceRoute(newPatientUrl)}
							>
								Register a new patient
							</WashButton>
						{/if}
					</div>
					{#if patientId && (loadingSource || sourceOpdVisits.length > 0 || orderLocked)}
						<div>
							<label
								class="label-ink mb-1 block text-sm"
								for="adm-source-opd"
							>
								Admit from OPD visit
								{#if sourceOpdVisits.length > 0}
									<span class="text-error">*</span>
								{/if}
							</label>
							{#if loadingSource}
								<p class="pt-2 text-sm opacity-70">Loading…</p>
							{:else}
								<WashSelect
									id="adm-source-opd"
									placeholder="Select OPD visit"
									options={sourceOpdOptions}
									bind:value={sourceOpdVisitId}
									disabled={orderLocked}
								/>
							{/if}
						</div>
					{/if}
					<div>
						<label class="label-ink mb-1 block text-sm" for="adm-ward"
							>Ward <span class="text-error">*</span></label
						>
						<WashSelect
							id="adm-ward"
							placeholder={`Select ${careSettingLabel(careSetting)} ward`}
							options={wardOptions}
							bind:value={wardId}
						/>
					</div>
					<div>
						<label class="label-ink mb-1 block text-sm" for="adm-bed"
							>Bed <span class="text-error">*</span></label
						>
						<WashSelect
							id="adm-bed"
							placeholder={wardId
								? 'Select free bed'
								: 'Select ward first'}
							options={bedOptions}
							bind:value={bedId}
							disabled={!wardId}
						/>
					</div>
					{#if isEd}
						<div>
							<label
								class="label-ink mb-1 block text-sm"
								for="adm-triage">Triage level</label
							>
							<WashSelect
								id="adm-triage"
								bind:value={edTriageLevelId}
								options={[
									{ value: '', label: '—' },
									...triageOptions
								]}
							/>
						</div>
						<div>
							<label
								class="label-ink mb-1 block text-sm"
								for="adm-doctor"
								>Attending doctor <span class="text-error">*</span
								></label
							>
							<SearchSelect
								inputId="adm-doctor"
								bind:value={doctorId}
								searchFn={searchDoctors}
								getLabelForValue={getDoctorLabel}
							/>
						</div>
						<div>
							<label
								class="label-ink mb-1 block text-sm"
								for="adm-arrived">Arrival date/time</label
							>
							<input
								id="adm-arrived"
								type="datetime-local"
								class="input input-bordered w-full cursor-text"
								bind:value={arrivedAtLocal}
							/>
						</div>
						<label
							class="label cursor-pointer justify-start gap-2 pt-8"
						>
							<input
								type="checkbox"
								class="checkbox checkbox-primary cursor-pointer"
								bind:checked={isMlc}
							/>
							<span>MLC case</span>
						</label>
						<div class="md:col-span-2 xl:col-span-3">
							<label
								class="label-ink mb-1 block text-sm"
								for="adm-complaint">Chief complaint</label
							>
							<WashInputField
								id="adm-complaint"
								bind:value={chiefComplaint}
								inputPlaceholderText="Optional"
							/>
						</div>
					{/if}
					<div class="md:col-span-2 xl:col-span-3">
						<label
							class="label-ink mb-1 block text-sm"
							for="adm-notes"
							>{isEd ? 'Registration remarks' : 'Notes'}</label
						>
						{#if isEd}
							<WashInputField
								id="adm-notes"
								bind:value={registrationRemarks}
								inputPlaceholderText="Optional"
							/>
						{:else}
							<WashInputField
								id="adm-notes"
								bind:value={reasonNotes}
								inputPlaceholderText="Optional"
							/>
						{/if}
					</div>
				</div>
				<WashCardBodyAction>
					<WashButton
						type="submit"
						variant="primary"
						disabled={isSubmitting ||
							loadingOrder ||
							!can(PageActionEnum.CREATE)}
						loading={isSubmitting}
					>
						{isEd ? 'Register in ED' : 'Admit'}
					</WashButton>
				</WashCardBodyAction>
			</form>
		</WashCardBody>
	</WashCard>
</div>
