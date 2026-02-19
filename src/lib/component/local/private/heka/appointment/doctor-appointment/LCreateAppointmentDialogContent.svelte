<script lang="ts">
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import {
		createAppointment,
		getAppointment
	} from '$lib/remote/table/information-table/appointment.remote';
	import { getPatientWithRelations } from '$lib/remote/table/information-table/patient.remote';
	import { getTitle } from '$lib/remote/table/master-table/title.remote';
	import { getReferType } from '$lib/remote/table/master-table/refer-type.remote';
	import { getExternalRefer } from '$lib/remote/table/information-table/external-refer.remote';
	import { getStatusTagging } from '$lib/remote/table/information-table/status-tagging.remote';
	import { CreateAppointmentDialogState } from '$lib/state/create-appointment-dialog.state.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import type { AppointmentSchemaInsert } from '$lib/server/db/schema-type';
	import type { TitleSchema } from '$lib/server/db/schema-type';
	import type {
		ExternalReferSchema,
		ReferTypeSchema,
		StatusTaggingSchema
	} from '$lib/server/db/schema-type';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	let { confirm, cancel } = $props();

	const toastService = new ToastService();
	const lifeCycle = new LifeCycleUtil();

	const slot = $derived(CreateAppointmentDialogState.slot);
	const staffId = $derived(CreateAppointmentDialogState.staffId);
	const slotDurationMinutes = $derived(CreateAppointmentDialogState.slotDurationMinutes);

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

	const effectiveDate = $derived(slot?.dateString ?? manualAppointmentDate);
	const effectiveFromTime = $derived(slot?.timeSlot ?? manualFromTime);
	const toTime = $derived(
		effectiveFromTime
			? addMinutesToTime(effectiveFromTime, totalMinutes)
			: ''
	);
	const isNoSlotMode = $derived(slot == null);

	// Lookup data
	let titleData = $state<TitleSchema[]>([]);
	let patientData = $state<Awaited<ReturnType<typeof getPatientWithRelations>>>([]);
	let referTypeData = $state<ReferTypeSchema[]>([]);
	let externalReferData = $state<ExternalReferSchema[]>([]);
	let statusTaggingData = $state<StatusTaggingSchema[]>([]);

	// Form state
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

	lifeCycle.onMount(async () => {
		const [titles, patients, referTypes, externalRefers, statusTaggings] = await Promise.all([
			getTitle(),
			getPatientWithRelations(),
			getReferType(),
			getExternalRefer(),
			getStatusTagging()
		]);
		titleData = titles;
		patientData = patients;
		referTypeData = referTypes;
		externalReferData = externalRefers;
		statusTaggingData = statusTaggings;
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

	/** Check if [from, to) overlaps any existing appointment for same staff/date (exclude optional id for edit). */
	async function hasOverlap(
		staffIdVal: string,
		dateStr: string,
		from: string,
		to: string,
		excludeId?: number
	): Promise<boolean> {
		const all = await getAppointment();
		const [fromH, fromM] = (from || '00:00').split(':').map(Number);
		const [toH, toM] = (to || '00:00').split(':').map(Number);
		const startMin = fromH * 60 + (fromM || 0);
		const endMin = toH * 60 + (toM || 0);
		for (const a of all) {
			if (String(a.staffId) !== staffIdVal) continue;
			if (String(a.appointmentDate).slice(0, 10) !== dateStr) continue;
			if (excludeId != null && a.id === excludeId) continue;
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
		if (isNoSlotMode && (!effectiveDate.trim() || !effectiveFromTime.trim())) {
			toastService.addToast('Please pick date and start time.', StatusColorEnum.ERROR);
			return;
		}
		if (!effectiveDate || !effectiveFromTime || !toTime) return;
		const overlap = await hasOverlap(
			staffId.trim(),
			effectiveDate,
			effectiveFromTime,
			toTime
		);
		if (overlap) {
			toastService.addToast('This time overlaps an existing appointment.', StatusColorEnum.ERROR);
			return;
		}
		isSubmitting = true;
		try {
			const payload: AppointmentSchemaInsert = {
				appointmentDate: effectiveDate,
				fromTime: effectiveFromTime,
				toTime,
				patientId: selectedPatientId?.trim() || null,
				staffId: staffId?.trim() || null,
				patientTitleId: selectedPatientTitleId ? parseInt(selectedPatientTitleId, 10) : null,
				patientName: patientName.trim() || null,
				patientDateOfBirth: patientDateOfBirth.trim() || null,
				patientAgeYear: patientAgeYear ? parseInt(patientAgeYear, 10) : null,
				patientAgeMonth: patientAgeMonth ? parseInt(patientAgeMonth, 10) : null,
				patientAgeDay: patientAgeDay ? parseInt(patientAgeDay, 10) : null,
				appointmentPhone: appointmentPhone.trim() || null,
				appointmentEmail: appointmentEmail.trim() || null,
				referTypeId: selectedReferTypeId ? parseInt(selectedReferTypeId, 10) : null,
				externalReferId: selectedExternalReferId ? parseInt(selectedExternalReferId, 10) : null,
				statusTaggingId: selectedStatusTaggingId ? parseInt(selectedStatusTaggingId, 10) : null
			};
			const created = await createAppointment(payload);
			toastService.addToast('Appointment created.', StatusColorEnum.SUCCESS);
			confirm(created);
		} catch (e) {
			toastService.addToast(
				e instanceof Error ? e.message : 'Failed to create appointment.',
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
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="apt-date" className="shrink-0 sm:w-36">Date</DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<input
						type="text"
						value={slot.dateString}
						disabled
						class="d-input d-input-bordered d-input-sm w-full"
						readonly
						aria-readonly="true"
					/>
				</div>
			</div>
			<div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
				<DaisyUiLabel forText="apt-from" className="shrink-0 sm:w-36">From</DaisyUiLabel>
				<div class="max-w-80 flex-1">
					<input
						type="text"
						value={slot.timeSlot}
						disabled
						class="d-input d-input-bordered d-input-sm w-full"
						readonly
						aria-readonly="true"
					/>
				</div>
			</div>
		{:else}
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
		{/if}
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
					aria-readonly="true"
				/>
			</div>
		</div>
	</div>

	<!-- Patient & details -->
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
				<DaisyUiLabel forText="apt-name" className="shrink-0 sm:w-36">Patient Name <span class="text-error">*</span></DaisyUiLabel>
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

	<div class="d-modal-action flex justify-end gap-2 border-t border-base-300 pt-4">
		<button type="button" class="d-btn" onclick={() => cancel()} disabled={isSubmitting}>
			Cancel
		</button>
		<button
			type="button"
			class="d-btn d-btn-primary"
			onclick={() => handleCreate()}
			disabled={!effectiveDate || !effectiveFromTime || !toTime || isSubmitting}
		>
			{isSubmitting ? 'Creating…' : 'Create'}
		</button>
	</div>
</div>
