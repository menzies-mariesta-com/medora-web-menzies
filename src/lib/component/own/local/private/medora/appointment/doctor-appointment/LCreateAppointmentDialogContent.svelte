<script lang="ts">
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashTextarea from '$lib/component/wash/textarea/WashTextarea.svelte';
	import { CreateAppointmentDialogState } from '$lib/state/create-appointment-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import type { AppointmentCreatePayload } from '$lib/model/type/medora/appointment.type';
	import type { PatientRegTitleRow } from '$lib/model/type/medora/patient-reg-master.type';
	import type {
		ExternalReferListRow,
		ReferTypeListRow,
		StatusTaggingListRow
	} from '$lib/model/type/medora/ui-rows.type';
	import type { PatientWithRelations } from '$lib/model/type/medora/patient.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type { AppointmentWithRelations } from '$lib/model/type/medora/appointment.type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { page } from '$app/state';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { StatusTaggingTypeEnum } from '$lib/model/enum/db-link';
	import { m } from '$lib/paraglide/messages';
	import { toastSuccess } from '$lib/util/toast-copy.util';

	let { confirm, cancel } = $props();

	const hospitalId = $derived(
		(typeof page.params?.hospital_id === 'string' &&
			page.params.hospital_id) ||
			''
	);
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/appointment/doctor-appointment`
			: ''
	);
	async function apiGet<T>(
		mode: string,
		params?: Record<string, string | undefined>
	): Promise<T> {
		const sp = new URLSearchParams();
		sp.set('mode', mode);
		if (params) {
			for (const [k, v] of Object.entries(params)) {
				if (v != null && v !== '') sp.set(k, v);
			}
		}
		const res = await fetch(`${apiBase}?${sp.toString()}`, {
			method: 'GET'
		});
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}
	async function apiPost<T>(
		mode: string,
		body?: Record<string, unknown>
	): Promise<T> {
		const res = await fetch(apiBase, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ mode, ...(body ?? {}) })
		});
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	const toastService = new ToastService();
	const lifeCycle = new LifeCycleUtil();

	const slot = $derived(CreateAppointmentDialogState.slot);
	const staffId = $derived(CreateAppointmentDialogState.staffId);
	const selectedBranchId = $derived(
		CreateAppointmentDialogState.branchId
	);
	const slotDurationMinutes = $derived(
		CreateAppointmentDialogState.slotDurationMinutes
	);

	/** Compute toTime from timeSlot + total minutes (e.g. "09:00" + 60 → "10:00"). */
	function addMinutesToTime(hhmm: string, minutes: number): string {
		const [hStr, mStr] = hhmm.split(':');
		let h = parseInt(hStr ?? '0', 10);
		let m = parseInt(mStr ?? '0', 10) + minutes;
		h += Math.floor(m / 60);
		m = m % 60;
		if (h >= 24) h = 23;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	/** Align with calendar grid / DB time parsing (e.g. "9:00" → "09:00"). */
	function toHHmm(t: string): string {
		if (!t) return '';
		const parts = String(t).trim().split(':');
		const h = parts[0]
			? String(Number(parts[0])).padStart(2, '0')
			: '00';
		const m = parts[1]
			? String(Number(parts[1])).padStart(2, '0')
			: '00';
		return `${h}:${m}`;
	}

	/** Number of slots to book (1 = slotDurationMinutes, 2 = 2× slotDurationMinutes, etc.). */
	let slotCount = $state(1);

	const slotCountNum = $derived(
		Math.min(24, Math.max(1, Math.floor(Number(slotCount) || 1)))
	);
	const totalMinutes = $derived(
		slotCountNum * (slotDurationMinutes ?? 15)
	);
	/** When opening from Plus (no cell), user must pick date and start time. */
	let manualAppointmentDate = $state('');
	let manualFromTime = $state('');

	const effectiveDate = $derived(
		slot?.dateString ?? manualAppointmentDate
	);
	const effectiveFromTime = $derived(
		slot?.timeSlot ?? manualFromTime
	);
	const toTime = $derived(
		effectiveFromTime
			? addMinutesToTime(effectiveFromTime, totalMinutes)
			: ''
	);
	const isNoSlotMode = $derived(slot == null);

	// Lookup data
	let titleData = $state<PatientRegTitleRow[]>([]);
	let referTypeData = $state<ReferTypeListRow[]>([]);
	let externalReferData = $state<ExternalReferListRow[]>([]);
	let statusTaggingData = $state<StatusTaggingListRow[]>([]);
	const DOCTOR_APPOINTMENT_STATUS_TAGGING_TYPE_ID =
		StatusTaggingTypeEnum.DOCTOR_APPOINTMENT;

	// Form state
	let patientMode = $state<'existing' | 'new'>('existing');
	let selectedPatientId = $state('');
	let selectedPatientTitleId = $state('');
	let patientName = $state('');
	let patientDateOfBirth = $state('');
	let patientAgeYear = $state('');
	let patientAgeMonth = $state('');
	let patientAgeDay = $state('');
	let skipNextDobToAgeSync = $state(false);
	let appointmentPhone = $state('');
	let appointmentEmail = $state('');
	let appointmentRemark = $state('');
	let selectedReferTypeId = $state('');
	let selectedExternalReferId = $state('');
	let selectedStatusTaggingId = $state('');
	let isSubmitting = $state(false);

	/** Server-side patient search for the dropdown. Returns options with label (full name) and value (id). */
	async function searchPatients(
		query: string
	): Promise<{ label: string; value: string }[]> {
		const res = await apiGet<PaginatedResult<PatientWithRelations>>(
			'patient.paginated',
			{
				search: query.trim() || undefined,
				page: '1',
				pageSize: String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT)
			}
		);
		const list = (res.data ?? []).map((p) => {
			return {
				label: StringUtil.patientOptionDisplayName(p),
				value: String(p.id)
			};
		});
		return [...list];
	}

	/** Resolve selected patient id to display label (when not in current search results). */
	async function getPatientLabelForValue(
		id: string
	): Promise<string> {
		const p = await apiGet<PatientWithRelations | null>(
			'patient.byId',
			{
				id
			}
		);
		if (!p) return '';
		return StringUtil.patientOptionDisplayName(p);
	}

	const selectedReferType = $derived.by(
		() =>
			referTypeData.find(
				(r) => String(r.id) === (selectedReferTypeId?.trim() || '')
			) ?? null
	);
	const selectedReferTypeName = $derived.by(() =>
		(selectedReferType?.name ?? '').trim().toLowerCase()
	);
	const referBoxLabel = $derived.by(() =>
		selectedReferTypeName === 'internal'
			? 'Internal Refer'
			: 'External Refer'
	);
	const filteredExternalReferData = $derived.by(() => {
		const typeId = selectedReferType?.id;
		return typeId != null
			? externalReferData.filter((e) => e.referTypeId === typeId)
			: externalReferData;
	});

	const hasSelectedPatient = $derived.by(
		() => !!selectedPatientId?.trim()
	);

	const availableStatusTaggingData = $derived.by(() => {
		// Cancel is only available in edit dialog, never on create.
		// For new patients (no linked account), also hide "Check In".
		const doctorAppointmentTaggings = statusTaggingData.filter(
			(s) =>
				s.statusTaggingTypeId ===
				DOCTOR_APPOINTMENT_STATUS_TAGGING_TYPE_ID
		);
		return doctorAppointmentTaggings.filter((s) => {
			const raw = (s.code ?? s.name ?? '')
				.trim()
				.toLowerCase()
				.replace(/[\s_-]/g, '');
			if (raw === 'cancel') return false;
			if (patientMode === 'new' && raw === 'checkin') return false;
			return true;
		});
	});

	function isCheckInStatus(id: string | null | undefined): boolean {
		if (!id) return false;
		const status = statusTaggingData.find((s) => String(s.id) === id);
		if (!status) return false;
		const raw = (status.code ?? status.name ?? '')
			.trim()
			.toLowerCase()
			.replace(/[\s_-]/g, '');
		return raw === 'checkin';
	}

	function isCancelStatusTaggingId(
		id: number | null | undefined
	): boolean {
		if (id == null) return false;
		const status = statusTaggingData.find((s) => s.id === id);
		if (!status) return false;
		const raw = (status.code ?? status.name ?? '')
			.trim()
			.toLowerCase()
			.replace(/[\s_-]/g, '');
		return raw === 'cancel' || raw === 'cancelled';
	}

	// When in "new" patient mode, clear "Check In" if currently selected
	$effect(() => {
		if (patientMode === 'new' && selectedStatusTaggingId) {
			const current = statusTaggingData.find(
				(s) => String(s.id) === selectedStatusTaggingId
			);
			if (current) {
				const raw = (current.code ?? current.name ?? '')
					.trim()
					.toLowerCase()
					.replace(/[\s_-]/g, '');
				if (raw === 'checkin') {
					selectedStatusTaggingId = '';
				}
			}
		}
	});

	// Default to first doctor-appointment status (usually Unconfirmed) so create always sends statusTaggingId.
	$effect(() => {
		const opts = availableStatusTaggingData;
		if (opts.length === 0) return;
		const cur = selectedStatusTaggingId?.trim();
		if (!cur || !opts.some((s) => String(s.id) === cur)) {
			selectedStatusTaggingId = String(opts[0].id);
		}
	});

	// When switching to "new" mode, clear any selected patient account
	$effect(() => {
		if (patientMode === 'new' && selectedPatientId) {
			selectedPatientId = '';
		}
	});

	// Clear external/internal refer selection when refer type is cleared
	$effect(() => {
		const id = selectedReferTypeId?.trim();
		if (!id && selectedExternalReferId) {
			selectedExternalReferId = '';
		}
	});

	function getAgeFromBirthDate(dob: string): {
		years: number;
		months: number;
		days: number;
	} {
		const birth = new Date(dob);
		const today = new Date();
		let years = today.getFullYear() - birth.getFullYear();
		let months = today.getMonth() - birth.getMonth();
		let days = today.getDate() - birth.getDate();
		if (days < 0) {
			months -= 1;
			const prevMonth = new Date(
				today.getFullYear(),
				today.getMonth(),
				0
			);
			days += prevMonth.getDate();
		}
		if (months < 0) {
			years -= 1;
			months += 12;
		}
		return { years, months, days };
	}

	function getBirthDateFromAge(
		years: number,
		months: number,
		days: number
	): string {
		const d = new Date();
		d.setDate(d.getDate() - days);
		d.setMonth(d.getMonth() - months);
		d.setFullYear(d.getFullYear() - years);
		return d.toISOString().slice(0, 10);
	}

	function syncAgeFromDateOfBirth(): void {
		const dob = patientDateOfBirth ?? '';
		if (!dob || dob.length < 10) {
			patientAgeYear = '';
			patientAgeMonth = '';
			patientAgeDay = '';
			return;
		}
		const age = getAgeFromBirthDate(dob);
		patientAgeYear = String(age.years);
		patientAgeMonth = String(age.months);
		patientAgeDay = String(age.days);
	}

	// dateOfBirth → age (skip when change came from age fields)
	$effect(() => {
		if (skipNextDobToAgeSync) {
			skipNextDobToAgeSync = false;
			return;
		}
		const dob = patientDateOfBirth ?? '';
		if (!dob || dob.length < 10) {
			patientAgeYear = '';
			patientAgeMonth = '';
			patientAgeDay = '';
			return;
		}
		syncAgeFromDateOfBirth();
	});

	// age → dateOfBirth
	$effect(() => {
		const y = String(patientAgeYear ?? '').trim();
		if (!y) {
			if ((patientDateOfBirth ?? '') !== '') {
				patientDateOfBirth = '';
			}
			return;
		}
		const numY = Number(y);
		const numM =
			patientAgeMonth != null && patientAgeMonth !== ''
				? Math.min(11, Math.max(0, Number(patientAgeMonth)))
				: 0;
		const numD =
			patientAgeDay != null && patientAgeDay !== ''
				? Math.max(0, Number(patientAgeDay))
				: 0;
		const next = getBirthDateFromAge(numY, numM, numD);
		if (next !== (patientDateOfBirth ?? '')) {
			skipNextDobToAgeSync = true;
			patientDateOfBirth = next;
			patientAgeYear = String(numY);
			patientAgeMonth = String(numM);
			patientAgeDay = String(numD);
		}
	});

	lifeCycle.onMount(async () => {
		const [titles, referTypes, externalRefers, statusTaggings] =
			await Promise.all([
				apiGet<PatientRegTitleRow[]>('title.list'),
				apiGet<ReferTypeListRow[]>('referType.list'),
				apiGet<ExternalReferListRow[]>('externalRefer.list'),
				apiGet<StatusTaggingListRow[]>('statusTagging.list')
			]);
		titleData = titles;
		referTypeData = referTypes;
		externalReferData = externalRefers;
		statusTaggingData = statusTaggings;
	});

	$effect(() => {
		const id = selectedPatientId?.trim();
		if (!id) return;
		apiGet<PatientWithRelations | null>('patient.byId', { id }).then(
			(p) => {
				if (!p) return;
				const titleName = p.title?.name;
				patientName = StringUtil.fullNameWithTitle(
					titleName ?? undefined,
					p.firstName ?? '',
					p.middleName ?? '',
					p.lastName ?? ''
				);
				if (p.titleId != null)
					selectedPatientTitleId = String(p.titleId);
				if (p.dateOfBirth != null)
					patientDateOfBirth = String(p.dateOfBirth).slice(0, 10);
			}
		);
	});

	/** Check if [from, to) overlaps any existing appointment for same staff/date (exclude optional id for edit). */
	async function hasOverlap(
		staffIdVal: string,
		dateStr: string,
		from: string,
		to: string,
		excludeId?: number
	): Promise<boolean> {
		const all = await apiGet<AppointmentWithRelations[]>(
			'appointment.list',
			{
				branchId: selectedBranchId || undefined
			}
		);
		const [fromH, fromM] = (from || '00:00').split(':').map(Number);
		const [toH, toM] = (to || '00:00').split(':').map(Number);
		const startMin = fromH * 60 + (fromM || 0);
		const endMin = toH * 60 + (toM || 0);
		for (const a of all) {
			if (String(a.staffId) !== staffIdVal) continue;
			if (String(a.appointmentDate).slice(0, 10) !== dateStr)
				continue;
			if (excludeId != null && a.id === excludeId) continue;
			// Cancelled appointments should not block a new appointment.
			if (isCancelStatusTaggingId(a.statusTaggingId ?? null))
				continue;
			const aFrom = String(a.fromTime ?? '').trim();
			const aTo = String(a.toTime ?? '').trim();
			if (!aFrom || !aTo) continue;
			const [aFromH, aFromM] = aFrom.split(':').map(Number);
			const [aToH, aToM] = aTo.split(':').map(Number);
			const aStart = aFromH * 60 + (aFromM || 0);
			const aEnd = aToH * 60 + (aToM || 0);
			if (startMin < aEnd && endMin > aStart) return true;
		}
		return false;
	}

	async function handleCreate() {
		if (!staffId?.trim()) return;
		if (!selectedBranchId?.trim()) {
			toastService.addToast(
				'Please select a branch before creating appointment.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (
			isNoSlotMode &&
			(!effectiveDate.trim() || !effectiveFromTime.trim())
		) {
			toastService.addToast(
				'Please pick date and start time.',
				StatusColorEnum.ERROR
			);
			return;
		}
		if (!effectiveDate || !effectiveFromTime || !toTime) return;
		const fromNorm = toHHmm(effectiveFromTime);
		const toNorm = toHHmm(toTime);
		const overlap = await hasOverlap(
			staffId.trim(),
			effectiveDate,
			fromNorm,
			toNorm
		);
		if (overlap) {
			toastService.addToast(
				'This time overlaps an existing appointment.',
				StatusColorEnum.ERROR
			);
			return;
		}
		isSubmitting = true;
		try {
			const payload: AppointmentCreatePayload = {
				hospitalId: hospitalId || '',
				branchId: selectedBranchId,
				appointmentDate: effectiveDate,
				fromTime: fromNorm,
				toTime: toNorm,
				patientId: selectedPatientId?.trim() || null,
				staffId: staffId?.trim() || null,
				patientTitleId: selectedPatientTitleId
					? parseInt(selectedPatientTitleId, 10)
					: null,
				patientName: patientName.trim() || null,
				patientDateOfBirth: patientDateOfBirth.trim() || null,
				patientAgeYear: patientAgeYear
					? parseInt(patientAgeYear, 10)
					: null,
				patientAgeMonth: patientAgeMonth
					? parseInt(patientAgeMonth, 10)
					: null,
				patientAgeDay: patientAgeDay
					? parseInt(patientAgeDay, 10)
					: null,
				appointmentPhone: appointmentPhone.trim() || null,
				appointmentEmail: appointmentEmail.trim() || null,
				referTypeId: selectedReferTypeId
					? parseInt(selectedReferTypeId, 10)
					: null,
				externalReferId: selectedExternalReferId
					? parseInt(selectedExternalReferId, 10)
					: null,
				statusTaggingId: selectedStatusTaggingId
					? parseInt(selectedStatusTaggingId, 10)
					: null,
				remark: appointmentRemark.trim() || null
			};
			const created = await apiPost<any>('appointment.create', {
				payload
			});

			// If this appointment is immediately in "Check In" for an existing patient,
			// create a patient visit record.
			const patientIdVal = selectedPatientId?.trim() || null;
			if (
				patientIdVal &&
				isCheckInStatus(selectedStatusTaggingId) &&
				hospitalId &&
				staffId?.trim()
			) {
				try {
					await apiPost('patientVisit.create', {
						payload: {
							patientId: patientIdVal,
							hospitalId,
							branchId: selectedBranchId,
							appointmentId: created.id,
							doctorId: staffId.trim() || null,
							statusTaggingId: null,
							visitTypeId: 1,
							statusId: undefined
						}
					});
				} catch (e) {
					// Do not block appointment creation if visit creation fails.
					console.error(
						'Failed to create patient visit for check-in:',
						e
					);
				}
			}

			toastSuccess(
				toastService,
				m.entity_appointment(),
				m.toast_action_created()
			);
			confirm(created);
		} catch (e) {
			toastService.addToast(
				e instanceof Error
					? e.message
					: 'Failed to create appointment.',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-col gap-5">
	<!-- Date & time: from cell (read-only) or manual (required when opened from Plus) -->
	<div class="flex flex-col gap-3 rounded-lg bg-base-200/50 p-3">
		{#if slot}
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="apt-date" class="shrink-0 sm:w-36">Date</label>
				<div class="max-w-80 flex-1">
					<input
						type="text"
						value={slot.dateString}
						disabled
						class="input-bordered input input-sm w-full"
						readonly
						aria-readonly="true"
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="apt-from" class="shrink-0 sm:w-36">From</label>
				<div class="max-w-80 flex-1">
					<input
						type="text"
						value={slot.timeSlot}
						disabled
						class="input-bordered input input-sm w-full"
						readonly
						aria-readonly="true"
					/>
				</div>
			</div>
		{:else}
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="apt-date" class="shrink-0 sm:w-36">Date <span class="text-error">*</span></label>
				<div class="max-w-80 flex-1">
					<WashInputField
						id="apt-date"
						bind:value={manualAppointmentDate}
						inputType="date"
						className="w-full"
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="apt-from" class="shrink-0 sm:w-36">Start time <span class="text-error">*</span></label>
				<div class="max-w-80 flex-1">
					<WashInputField
						id="apt-from"
						bind:value={manualFromTime}
						inputType="time"
						className="w-full"
					/>
				</div>
			</div>
		{/if}
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="apt-slots" class="shrink-0 sm:w-36">Number of slots</label>
			<div class="flex max-w-80 flex-1 items-center gap-2">
				<input
					id="apt-slots"
					type="number"
					min="1"
					max="24"
					class="input-bordered input input-sm w-20"
					bind:value={slotCount}
					aria-label="Number of slots"
				/>
				<span class="text-sm text-base-content/70">
					({slotDurationMinutes} min/slot → {totalMinutes} min total)
				</span>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="apt-to" class="shrink-0 sm:w-36">To</label>
			<div class="max-w-80 flex-1">
				<input
					type="text"
					value={toTime}
					disabled
					class="input-bordered input input-sm w-full"
					readonly
					aria-readonly="true"
				/>
			</div>
		</div>
	</div>

	<!-- Patient & details -->
	<div class="flex flex-col gap-4">
		<div
			class="flex min-w-0 gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<div class="flex max-w-80 flex-1 justify-between gap-1">
				<label class="inline-flex items-center gap-2">
					<input
						type="radio"
						name="patient-mode"
						class="radio radio-primary"
						value="existing"
						bind:group={patientMode}
					/>
					<span>Existing patient</span>
				</label>
				<label class="inline-flex items-center gap-2">
					<input
						type="radio"
						name="patient-mode"
						class="radio radio-primary"
						value="new"
						bind:group={patientMode}
					/>
					<span>New patient</span>
				</label>
			</div>
		</div>
		{#if patientMode === 'existing'}
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<SearchSelect
					bind:value={selectedPatientId}
					placeholder="Select Patient"
					className="w-full"
					searchFn={searchPatients}
					getLabelForValue={getPatientLabelForValue}
					minSearchLength={0}
				/>
			</div>
		{/if}
		{#if patientMode === 'new'}
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="apt-title" class="shrink-0 sm:w-36">Patient Title</label>
				<div class="max-w-80 flex-1">
					<WashSelect
						bind:value={selectedPatientTitleId}
						optionHeader="Select title …"
						className="w-full"
					>
						{#each titleData as t (t.id)}
							<option value={String(t.id)}>{t.name}</option>
						{/each}
					</WashSelect>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="apt-name" class="shrink-0 sm:w-36">Patient Name <span class="text-error">*</span
					></label>
				<div class="max-w-80 flex-1">
					<WashInputField
						bind:value={patientName}
						inputType="text"
						className="w-full"
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="apt-dob" class="shrink-0 sm:w-36">Date of Birth</label>
				<div class="max-w-80 flex-1">
					<WashInputField
						bind:value={patientDateOfBirth}
						inputType="date"
						className="w-full"
					/>
				</div>
			</div>
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="apt-age" class="shrink-0 sm:w-36">Age (Y / M / D)</label>
				<div class="flex max-w-80 flex-1 gap-2">
					<WashInputField
						bind:value={patientAgeYear}
						inputType="number"
						inputPlaceholderText="Y"
						className="w-20"
					/>
					<WashInputField
						bind:value={patientAgeMonth}
						inputType="number"
						inputPlaceholderText="M"
						className="w-20"
					/>
					<WashInputField
						bind:value={patientAgeDay}
						inputType="number"
						inputPlaceholderText="D"
						className="w-20"
					/>
				</div>
			</div>
		{/if}
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="apt-phone" class="shrink-0 sm:w-36">Guardian Phone</label>
			<div class="max-w-80 flex-1">
				<WashInputField
					bind:value={appointmentPhone}
					inputType="tel"
					className="w-full"
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="apt-email" class="shrink-0 sm:w-36">Email</label>
			<div class="max-w-80 flex-1">
				<WashInputField
					bind:value={appointmentEmail}
					inputType="email"
					inputPlaceholderText="mail@example.com"
					className="w-full"
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="apt-refer-type" class="shrink-0 sm:w-36">Refer Type</label>
			<div class="max-w-80 flex-1">
				<WashSelect
					bind:value={selectedReferTypeId}
					optionHeader="Select refer type …"
					className="w-full"
				>
					{#each referTypeData as r (r.id)}
						<option value={String(r.id)}>{r.name}</option>
					{/each}
				</WashSelect>
			</div>
		</div>
		{#if selectedReferTypeId?.trim()}
			<div
				class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
			>
				<label for="apt-external-refer" class="shrink-0 sm:w-36">{referBoxLabel}</label>
				<div class="max-w-80 flex-1">
					<WashSelect
						bind:value={selectedExternalReferId}
						optionHeader="Select external refer …"
						className="w-full"
					>
						{#each filteredExternalReferData as e (e.id)}
							<option value={String(e.id)}>{e.name}</option>
						{/each}
					</WashSelect>
				</div>
			</div>
		{/if}
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3"
		>
			<label for="apt-remark" class="shrink-0 sm:w-36">Remark</label>
			<div class="max-w-80 flex-1">
				<WashTextarea
					id="apt-remark"
					bind:value={appointmentRemark}
					className="w-full min-h-24 resize-y"
				/>
			</div>
		</div>
		<div
			class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
		>
			<label for="apt-status-tagging" class="shrink-0 sm:w-36">Status Tagging</label>
			<div class="max-w-80 flex-1">
				<WashSelect
					bind:value={selectedStatusTaggingId}
					optionHeader="Select status …"
					className="w-full"
				>
					{#each availableStatusTaggingData as s (s.id)}
						<option value={String(s.id)}>{s.name}</option>
					{/each}
				</WashSelect>
			</div>
		</div>
		{#if patientMode === 'new'}
			<p class="mt-1 w-full text-xs text-info">
				To use <span class="font-semibold">Check In</span>, first
				register the patient in the patient registration page, then
				return here, choose the patient under
				<span class="font-semibold">Existing patient</span>, and
				continue.
			</p>
		{/if}
	</div>

	<div
		class="modal-action flex justify-end gap-2 border-t border-base-300 pt-4"
	>
		<button
			type="button"
			class="btn"
			onclick={() => cancel()}
			disabled={isSubmitting}
		>
			Cancel
		</button>
		<button
			type="button"
			class="btn btn-primary"
			onclick={() => handleCreate()}
			disabled={!effectiveDate ||
				!effectiveFromTime ||
				!toTime ||
				isSubmitting}
		>
			{isSubmitting ? 'Creating…' : 'Create'}
		</button>
	</div>
</div>
