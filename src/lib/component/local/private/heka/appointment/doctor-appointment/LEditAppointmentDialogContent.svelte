<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSearchSelect from '$lib/component/library/daisyui/search-select/DaisyUISearchSelect.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTextarea from '$lib/component/library/daisyui/textarea/DaisyUiTextarea.svelte';
import {
	getAppointment,
	getAppointmentById,
	updateAppointment,
	deleteAppointment
	} from '$lib/remote/table/information-table/appointment.remote';
import { createPatientVisit } from '$lib/remote/table/information-table/patient-visit.remote';
	import {
		getPatientPaginated,
		getPatientByIdWithRelations
	} from '$lib/remote/table/information-table/patient.remote';
	import { getTitle } from '$lib/remote/table/master-table/title.remote';
	import { getReferType } from '$lib/remote/table/master-table/refer-type.remote';
	import { getExternalRefer } from '$lib/remote/table/information-table/external-refer.remote';
	import { getStatusTagging } from '$lib/remote/table/information-table/status-tagging.remote';
	import { EditAppointmentDialogState } from '$lib/state/edit-appointment-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import type { AppointmentSchemaUpdate } from '$lib/server/db/schema-type';
	import type { TitleSchema } from '$lib/server/db/schema-type';
	import type {
		ExternalReferSchema,
		ReferTypeSchema,
		StatusTaggingSchema
	} from '$lib/server/db/schema-type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { page } from '$app/state';

	let { confirm, cancel }: DialogSlotProps = $props();

	const hospitalId = $derived(
		(typeof page.params?.hospital_id === 'string' && page.params.hospital_id) || ''
	);

	const toastService = new ToastService();
	const lifeCycle = new LifeCycleUtil();

	const appointmentId = $derived(EditAppointmentDialogState.appointmentId);
	const selectedBranchId = $derived(EditAppointmentDialogState.branchId);
	const slotDurationMinutes = $derived(EditAppointmentDialogState.slotDurationMinutes);

	function addMinutesToTime(hhmm: string, minutes: number): string {
		const [hStr, mStr] = hhmm.split(':');
		let h = parseInt(hStr ?? '0', 10);
		let m = parseInt(mStr ?? '0', 10) + minutes;
		h += Math.floor(m / 60);
		m = m % 60;
		if (h >= 24) h = 23;
		return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
	}

	function toHHmm(t: string): string {
		if (!t) return '';
		const parts = String(t).trim().split(':');
		const h = parts[0] ? String(Number(parts[0])).padStart(2, '0') : '00';
		const m = parts[1] ? String(Number(parts[1])).padStart(2, '0') : '00';
		return `${h}:${m}`;
	}

	let slotCount = $state(1);
	let manualAppointmentDate = $state('');
	let manualFromTime = $state('');

	const slotCountNum = $derived(
		Math.min(24, Math.max(1, Math.floor(Number(slotCount) || 1)))
	);
	const totalMinutes = $derived(slotCountNum * (slotDurationMinutes ?? 15));
	const toTime = $derived(
		manualFromTime ? addMinutesToTime(manualFromTime, totalMinutes) : ''
	);

	let titleData = $state<TitleSchema[]>([]);
	let referTypeData = $state<ReferTypeSchema[]>([]);
	let externalReferData = $state<ExternalReferSchema[]>([]);
	let statusTaggingData = $state<StatusTaggingSchema[]>([]);

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
	let isDeleting = $state(false);
	let loaded = $state(false);

	const hasSelectedPatient = $derived.by(
		() => !!selectedPatientId?.trim()
	);

const availableStatusTaggingData = $derived.by(() => {
	// For new patients (no linked account), hide "Check In" status
	if (patientMode === 'new') {
		return statusTaggingData.filter((s) => {
			const raw = (s.code ?? s.name ?? '')
				.trim()
				.toLowerCase()
				.replace(/[\s_-]/g, '');
			return raw !== 'checkin';
		});
	}
	return statusTaggingData;
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

// When in "new" patient mode, clear "Check In" if currently selected
$effect(() => {
	if (patientMode === 'new' && selectedStatusTaggingId) {
		if (isCheckInStatus(selectedStatusTaggingId)) {
			selectedStatusTaggingId = '';
		}
	}
});

	/** Server-side patient search for the dropdown. Returns options with label (code + full name) and value (id). */
	async function searchPatients(query: string): Promise<{ label: string; value: string }[]> {
		const res = await getPatientPaginated({
			search: query.trim(),
			hospitalId: hospitalId || undefined,
			branchId: selectedBranchId || undefined,
			page: 1,
			pageSize: 20
		});
		const list = res.data.map((p) => {
			const titleName = (p as { title?: { name?: string } }).title?.name;
			return {
				label: `${p.code} - ${StringUtil.fullNameWithTitle(
					titleName ?? undefined,
					p.firstName,
					p.middleName,
					p.lastName
				)}`,
				value: String(p.id)
			};
		});
		return list;
	}

	/** Resolve selected patient id to display label (when not in current search results). */
	async function getPatientLabelForValue(id: string): Promise<string> {
		const p = await getPatientByIdWithRelations({ id });
		if (!p) return '';
		const titleName = (p as { title?: { name?: string } }).title?.name;
		return `${p.code} - ${StringUtil.fullNameWithTitle(
			titleName ?? undefined,
			p.firstName,
			p.middleName,
			p.lastName
		)}`;
	}

	// Default patient mode after load based on whether appointment has a linked patient
	$effect(() => {
		if (!loaded) return;
		patientMode = hasSelectedPatient ? 'existing' : 'new';
	});

	// When switching to "new" mode, clear any selected patient account
	$effect(() => {
		if (patientMode === 'new' && selectedPatientId) {
			selectedPatientId = '';
		}
	});

	const selectedReferType = $derived.by(
		() =>
			referTypeData.find(
				(r) => String(r.id) === (selectedReferTypeId?.trim() || '')
			) ?? null
	);
	const selectedReferTypeName = $derived.by(
		() => (selectedReferType?.name ?? '').trim().toLowerCase()
	);
	const referBoxLabel = $derived.by(
		() =>
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
				? Math.min(
						11,
						Math.max(0, Number(patientAgeMonth))
					)
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
		const [titles, referTypes, externalRefers, statusTaggings, apt] =
			await Promise.all([
				getTitle(),
				getReferType(),
				getExternalRefer(),
				getStatusTagging(),
				appointmentId != null ? getAppointmentById({ id: appointmentId }) : Promise.resolve(null)
			]);
		titleData = titles;
		referTypeData = referTypes;
		externalReferData = externalRefers;
		statusTaggingData = statusTaggings;
		if (apt) {
			manualAppointmentDate = String(apt.appointmentDate ?? '').slice(0, 10);
			manualFromTime = toHHmm(String(apt.fromTime ?? ''));
			selectedPatientId = apt.patientId ? String(apt.patientId) : '';
			selectedPatientTitleId = apt.patientTitleId != null ? String(apt.patientTitleId) : '';
			patientName = apt.patientName?.trim() ?? '';
			patientDateOfBirth = String(apt.patientDateOfBirth ?? '').slice(0, 10);
			patientAgeYear = apt.patientAgeYear != null ? String(apt.patientAgeYear) : '';
			patientAgeMonth = apt.patientAgeMonth != null ? String(apt.patientAgeMonth) : '';
			patientAgeDay = apt.patientAgeDay != null ? String(apt.patientAgeDay) : '';
			appointmentPhone = apt.appointmentPhone?.trim() ?? '';
			appointmentEmail = apt.appointmentEmail?.trim() ?? '';
			selectedReferTypeId = apt.referTypeId != null ? String(apt.referTypeId) : '';
			selectedExternalReferId = apt.externalReferId != null ? String(apt.externalReferId) : '';
			selectedStatusTaggingId =
				apt.statusTaggingId != null ? String(apt.statusTaggingId) : '';
			appointmentRemark = apt.remark?.trim() ?? '';
			const fromMin = (() => {
				const [h, m] = manualFromTime.split(':').map(Number);
				return (h ?? 0) * 60 + (m ?? 0);
			})();
			const toStr = String(apt.toTime ?? '');
			const [toH, toM] = toStr.split(':').map(Number);
			const toMin = (toH ?? 0) * 60 + (toM ?? 0);
			const duration = toMin - fromMin;
			slotCount = Math.max(
				1,
				Math.round(duration / (slotDurationMinutes ?? 15))
			);
		}
		loaded = true;
	});

	$effect(() => {
		const id = selectedPatientId?.trim();
		if (!id) return;
		getPatientByIdWithRelations({ id }).then((p) => {
			if (!p) return;
			const titleName = (p as { title?: { name?: string } }).title?.name;
			patientName = StringUtil.fullNameWithTitle(
				titleName ?? undefined,
				p.firstName ?? '',
				p.middleName ?? '',
				p.lastName ?? ''
			);
			if (p.titleId != null) selectedPatientTitleId = String(p.titleId);
			if (p.dateOfBirth != null)
				patientDateOfBirth = String(p.dateOfBirth).slice(0, 10);
		});
	});

	async function hasOverlap(
		staffIdVal: string,
		dateStr: string,
		from: string,
		to: string,
		excludeId: number
	): Promise<boolean> {
		const all = await getAppointment();
		const [fromH, fromM] = (from || '00:00').split(':').map(Number);
		const [toH, toM] = (to || '00:00').split(':').map(Number);
		const startMin = fromH * 60 + (fromM || 0);
		const endMin = toH * 60 + (toM || 0);
		for (const a of all) {
			if (String(a.staffId) !== staffIdVal) continue;
			if (String(a.appointmentDate).slice(0, 10) !== dateStr) continue;
			if (a.id === excludeId) continue;
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

	async function handleUpdate() {
		if (appointmentId == null) return;
		if (!manualAppointmentDate.trim() || !manualFromTime.trim() || !toTime) return;
		const latest = await getAppointmentById({ id: appointmentId });
		const staffIdVal = latest?.staffId;
		if (!staffIdVal) return;

		// Enforce step-by-step status changes (cannot skip from Unconfirmed → Check In directly)
		const currentStatusId = latest.statusTaggingId ?? null;
		const nextStatusId = selectedStatusTaggingId
			? parseInt(selectedStatusTaggingId, 10)
			: null;
		let becomesCheckIn = false;
		if (currentStatusId != null && nextStatusId != null) {
			const currentStatus = statusTaggingData.find(
				(s) => s.id === currentStatusId
			);
			const nextStatus = statusTaggingData.find(
				(s) => s.id === nextStatusId
			);
			const currentSeq = currentStatus?.sequenceNo ?? null;
			const nextSeq = nextStatus?.sequenceNo ?? null;
			const currentIsCancel = currentStatus && isCheckInStatus(String(currentStatusId)) === false &&
				((currentStatus.code ?? currentStatus.name ?? '')
					.trim()
					.toLowerCase()
					.replace(/[\s_-]/g, '') === 'cancel');
			const nextIsCancel = nextStatus && isCheckInStatus(String(nextStatusId)) === false &&
				((nextStatus.code ?? nextStatus.name ?? '')
					.trim()
					.toLowerCase()
					.replace(/[\s_-]/g, '') === 'cancel');

			// Enforce step-by-step only between unconfirmed/confirmed/check-in (exclude cancel).
			if (!currentIsCancel && !nextIsCancel) {
				if (
					currentSeq != null &&
					nextSeq != null &&
					Math.abs(nextSeq - currentSeq) > 1
				) {
					toastService.addToast(
						'Status can only move one step at a time (Unconfirmed ↔ Confirmed ↔ Check In).',
						StatusColorEnum.ERROR
					);
					return;
				}
			}
			const currentIsCheckIn = isCheckInStatus(String(currentStatusId));
			const nextIsCheckIn = isCheckInStatus(String(nextStatusId));
			becomesCheckIn = !currentIsCheckIn && nextIsCheckIn;
		}

		const overlap = await hasOverlap(
			String(staffIdVal),
			manualAppointmentDate,
			manualFromTime,
			toTime,
			appointmentId
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
			const payload: AppointmentSchemaUpdate & { id: number } = {
				id: appointmentId,
				appointmentDate: manualAppointmentDate,
				fromTime: manualFromTime,
				toTime,
				patientId: selectedPatientId?.trim() || null,
				patientTitleId: selectedPatientTitleId ? parseInt(selectedPatientTitleId, 10) : null,
				patientName: patientName.trim() || null,
				patientDateOfBirth: patientDateOfBirth.trim() || null,
				patientAgeYear: patientAgeYear ? parseInt(patientAgeYear, 10) : null,
				patientAgeMonth: patientAgeMonth ? parseInt(patientAgeMonth, 10) : null,
				patientAgeDay: patientAgeDay ? parseInt(patientAgeDay, 10) : null,
				appointmentPhone: appointmentPhone.trim() || null,
				appointmentEmail: appointmentEmail.trim() || null,
				referTypeId: selectedReferTypeId ? parseInt(selectedReferTypeId, 10) : null,
				externalReferId: selectedExternalReferId
					? parseInt(selectedExternalReferId, 10)
					: null,
				statusTaggingId: selectedStatusTaggingId
					? parseInt(selectedStatusTaggingId, 10)
					: null,
				remark: appointmentRemark.trim() || null
			};
			await updateAppointment(payload);

			// When status newly becomes "Check In" for an existing patient, create a patient visit.
			const effectivePatientId =
				selectedPatientId?.trim() ||
				(latest?.patientId ? String(latest.patientId) : '');
			const effectiveBranchId = latest?.branchId ?? selectedBranchId ?? null;
			if (
				becomesCheckIn &&
				effectivePatientId &&
				hospitalId &&
				staffIdVal &&
				effectiveBranchId
			) {
				try {
					await createPatientVisit({
						patientId: effectivePatientId,
						hospitalId,
						branchId: effectiveBranchId,
						appointmentId,
						doctorId: String(staffIdVal),
						statusTypeId: null,
						// Default to OPD visit type (see master-table seed: id=1, code 'O').
						visitTypeId: 1,
						statusId: undefined,
						visitNo: null
					});
				} catch (e) {
					console.error('Failed to create patient visit for check-in:', e);
				}
			}

			toastService.addToast('Appointment updated.', StatusColorEnum.SUCCESS);
			confirm({ updated: true });
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Failed to update appointment.',
				StatusColorEnum.ERROR
			);
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		if (appointmentId == null) return;
		if (typeof window !== 'undefined' && !window.confirm('Delete this appointment?')) return;
		isDeleting = true;
		try {
			await deleteAppointment({ id: appointmentId });
			toastService.addToast('Appointment deleted.', StatusColorEnum.SUCCESS);
			confirm({ deleted: true });
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Failed to delete appointment.',
				StatusColorEnum.ERROR
			);
		} finally {
			isDeleting = false;
		}
	}
</script>

{#if !loaded}
	<p class="text-base-content/70">Loading…</p>
{:else if appointmentId == null}
	<p class="text-base-content/70">No appointment selected.</p>
{:else}
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-3 rounded-lg bg-base-200/50 p-3">
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="apt-date" className="shrink-0 sm:w-36">Date <span class="text-error">*</span></DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<DaisyUiInputField
						id="apt-date"
						bind:value={manualAppointmentDate}
						inputType="date"
						className="w-full"
					/>
				</div>
			</div>
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="apt-from" className="shrink-0 sm:w-36">Start time <span class="text-error">*</span></DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<DaisyUiInputField
						id="apt-from"
						bind:value={manualFromTime}
						inputType="time"
						className="w-full"
					/>
				</div>
			</div>
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="apt-slots" className="shrink-0 sm:w-36">Number of slots</DaisyUiLabel>
				<div class="max-w-80 flex-1 flex items-center gap-2">
					<input
						id="apt-slots"
						type="number"
						min="1"
						max="24"
						class="d-input d-input-bordered d-input-sm w-20"
						bind:value={slotCount}
						aria-label="Number of slots"
					/>
					<span class="text-sm text-base-content/70">
						({slotDurationMinutes} min/slot → {totalMinutes} min total)
					</span>
				</div>
			</div>
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="apt-to" className="shrink-0 sm:w-36">To</DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<input
						type="text"
						value={toTime}
						disabled
						class="d-input d-input-bordered d-input-sm w-full"
						readonly
					/>
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-4">
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
					<div class="max-w-80 flex-1 flex justify-between gap-1">
						<label class="inline-flex items-center gap-2">
							<input
								type="radio"
								name="patient-mode"
								class="d-radio d-radio-primary"
								value="existing"
								bind:group={patientMode}
							/>
							<span>Existing patient</span>
						</label>
						<label class="inline-flex items-center gap-2">
							<input
								type="radio"
								name="patient-mode"
								class="d-radio d-radio-primary"
								value="new"
								bind:group={patientMode}
							/>
							<span>New patient</span>
					</label>
				</div>
			</div>
			{#if patientMode === 'existing'}
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="apt-patient" className="shrink-0 sm:w-36">Patient</DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<DaisyUiSearchSelect
						bind:value={selectedPatientId}
						placeholder="Select patient (optional) …"
						className="w-full"
						searchFn={searchPatients}
						getLabelForValue={getPatientLabelForValue}
						minSearchLength={0}
					/>
				</div>
			</div>
			{/if}
			{#if patientMode === 'new'}
				<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
					<DaisyUiLabel forText="apt-title" className="shrink-0 sm:w-36">Patient Title</DaisyUiLabel>
					<div class="max-w-80 flex-1">
						<DaisyUiSelect
							bind:value={selectedPatientTitleId}
							optionHeader="Select title …"
							className="w-full"
						>
							{#each titleData as t (t.id)}
								<option value={String(t.id)}>{t.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>
				<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
					<DaisyUiLabel forText="apt-name" className="shrink-0 sm:w-36">Patient Name</DaisyUiLabel>
					<div class="max-w-80 flex-1">
						<DaisyUiInputField bind:value={patientName} inputType="text" className="w-full" />
					</div>
				</div>
				<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
					<DaisyUiLabel forText="apt-dob" className="shrink-0 sm:w-36">Date of Birth</DaisyUiLabel>
					<div class="max-w-80 flex-1">
						<DaisyUiInputField bind:value={patientDateOfBirth} inputType="date" className="w-full" />
					</div>
				</div>
				<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
					<DaisyUiLabel forText="apt-age" className="shrink-0 sm:w-36">Age (Y / M / D)</DaisyUiLabel>
					<div class="max-w-80 flex-1 flex gap-2">
						<DaisyUiInputField
							bind:value={patientAgeYear}
							inputType="number"
							inputPlaceholderText="Y"
							className="w-20"
						/>
						<DaisyUiInputField
							bind:value={patientAgeMonth}
							inputType="number"
							inputPlaceholderText="M"
							className="w-20"
						/>
						<DaisyUiInputField
							bind:value={patientAgeDay}
							inputType="number"
							inputPlaceholderText="D"
							className="w-20"
						/>
					</div>
				</div>
			{/if}
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="apt-phone" className="shrink-0 sm:w-36">Guardian Phone</DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<DaisyUiInputField bind:value={appointmentPhone} inputType="tel" className="w-full" />
				</div>
			</div>
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="apt-email" className="shrink-0 sm:w-36">Email</DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<DaisyUiInputField
						bind:value={appointmentEmail}
						inputType="email"
						inputPlaceholderText="mail@example.com"
						className="w-full"
					/>
				</div>
			</div>
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="apt-refer-type" className="shrink-0 sm:w-36">Refer Type</DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<DaisyUiSelect
						bind:value={selectedReferTypeId}
						optionHeader="Select refer type …"
						className="w-full"
					>
						{#each referTypeData as r (r.id)}
							<option value={String(r.id)}>{r.name}</option>
						{/each}
					</DaisyUiSelect>
				</div>
			</div>
			{#if selectedReferTypeId?.trim()}
				<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
					<DaisyUiLabel forText="apt-external-refer" className="shrink-0 sm:w-36">{referBoxLabel}</DaisyUiLabel>
					<div class="max-w-80 flex-1">
						<DaisyUiSelect
							bind:value={selectedExternalReferId}
							optionHeader="Select external refer …"
							className="w-full"
						>
							{#each filteredExternalReferData as e (e.id)}
								<option value={String(e.id)}>{e.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>
			{/if}
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
				<DaisyUiLabel forText="apt-remark" className="shrink-0 sm:w-36">Remark</DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<DaisyUiTextarea
						id="apt-remark"
						bind:value={appointmentRemark}
						className="w-full min-h-24 resize-y"
					/>
				</div>
			</div>
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="apt-status-tagging" className="shrink-0 sm:w-36">Status Tagging</DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<DaisyUiSelect
						bind:value={selectedStatusTaggingId}
						optionHeader="Select status …"
						className="w-full"
					>
						{#each availableStatusTaggingData as s (s.id)}
							<option value={String(s.id)}>{s.name}</option>
						{/each}
					</DaisyUiSelect>
				</div>
			</div>
			{#if patientMode === 'new'}
				<p class="text-xs text-info mt-1 w-full">
					To use <span class="font-semibold">Check In</span>, first register the patient in the patient registration page,
					then return here, choose the patient under <span class="font-semibold">Existing patient</span>, and continue.
				</p>
			{/if}
		</div>

		<div class="d-modal-action flex flex-wrap justify-end gap-2 border-t border-base-300 pt-4">
			<button
				type="button"
				class="d-btn d-btn-error d-btn-outline"
				onclick={() => handleDelete()}
				disabled={isSubmitting || isDeleting}
			>
				{isDeleting ? 'Deleting…' : 'Delete'}
			</button>
			<button type="button" class="d-btn" onclick={() => cancel()} disabled={isSubmitting || isDeleting}>
				Cancel
			</button>
			<button
				type="button"
				class="d-btn d-btn-primary"
				onclick={() => handleUpdate()}
				disabled={!manualAppointmentDate || !manualFromTime || !toTime || isSubmitting || isDeleting}
			>
				{isSubmitting ? 'Saving…' : 'Save'}
			</button>
		</div>
	</div>
{/if}
