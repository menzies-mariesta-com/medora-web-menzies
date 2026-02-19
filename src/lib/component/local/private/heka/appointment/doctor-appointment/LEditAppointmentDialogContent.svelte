<script lang="ts">
	import type { DialogSlotProps } from '$lib/model/interface/dialog.interface';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import {
		getAppointment,
		getAppointmentById,
		updateAppointment,
		deleteAppointment
	} from '$lib/remote/table/information-table/appointment.remote';
	import { getPatientWithRelations } from '$lib/remote/table/information-table/patient.remote';
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

	let { confirm, cancel }: DialogSlotProps = $props();

	const toastService = new ToastService();
	const lifeCycle = new LifeCycleUtil();

	const appointmentId = $derived(EditAppointmentDialogState.appointmentId);
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
	let patientData = $state<Awaited<ReturnType<typeof getPatientWithRelations>>>([]);
	let referTypeData = $state<ReferTypeSchema[]>([]);
	let externalReferData = $state<ExternalReferSchema[]>([]);
	let statusTaggingData = $state<StatusTaggingSchema[]>([]);

	let selectedPatientId = $state('');
	let selectedPatientTitleId = $state('');
	let patientName = $state('');
	let patientDateOfBirth = $state('');
	let patientAgeYear = $state('');
	let patientAgeMonth = $state('');
	let patientAgeDay = $state('');
	let appointmentPhone = $state('');
	let appointmentEmail = $state('');
	let selectedReferTypeId = $state('');
	let selectedExternalReferId = $state('');
	let selectedStatusTaggingId = $state('');
	let isSubmitting = $state(false);
	let isDeleting = $state(false);
	let loaded = $state(false);

	lifeCycle.onMount(async () => {
		const [titles, patients, referTypes, externalRefers, statusTaggings, apt] =
			await Promise.all([
				getTitle(),
				getPatientWithRelations(),
				getReferType(),
				getExternalRefer(),
				getStatusTagging(),
				appointmentId != null ? getAppointmentById({ id: appointmentId }) : Promise.resolve(null)
			]);
		titleData = titles;
		patientData = patients;
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
		const p = patientData.find((x) => String(x.id) === id);
		if (p) {
			const titleName = titleData.find((t) => t.id === p.titleId)?.name;
			patientName = StringUtil.fullNameWithTitle(
				titleName ?? undefined,
				p.firstName ?? '',
				p.middleName ?? '',
				p.lastName ?? ''
			);
			if (p.titleId != null) selectedPatientTitleId = String(p.titleId);
			if (p.dateOfBirth != null) patientDateOfBirth = String(p.dateOfBirth).slice(0, 10);
		}
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
		const staffIdVal = (await getAppointmentById({ id: appointmentId }))?.staffId;
		if (!staffIdVal) return;
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
					: null
			};
			await updateAppointment(payload);
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
				<DaisyUiLabel forText="apt-patient" className="shrink-0 sm:w-36">Patient</DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<DaisyUiSelect
						bind:value={selectedPatientId}
						optionHeader="Select patient (optional) …"
						className="w-full"
					>
						{#each patientData as p (p.id)}
							{@const titleName = titleData.find((t) => t.id === p.titleId)?.name}
							<option value={String(p.id)}>
								{StringUtil.fullNameWithTitle(
									titleName ?? undefined,
									p.firstName,
									p.middleName,
									p.lastName
								)}
							</option>
						{/each}
					</DaisyUiSelect>
				</div>
			</div>
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
				<DaisyUiLabel forText="apt-phone" className="shrink-0 sm:w-36">Phone</DaisyUiLabel>
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
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="apt-external-refer" className="shrink-0 sm:w-36">External Refer</DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<DaisyUiSelect
						bind:value={selectedExternalReferId}
						optionHeader="Select external refer …"
						className="w-full"
					>
						{#each externalReferData as e (e.id)}
							<option value={String(e.id)}>{e.name}</option>
						{/each}
					</DaisyUiSelect>
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
						{#each statusTaggingData as s (s.id)}
							<option value={String(s.id)}>{s.name}</option>
						{/each}
					</DaisyUiSelect>
				</div>
			</div>
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
