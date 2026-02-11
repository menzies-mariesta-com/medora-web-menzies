<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBodyAction from '$lib/component/library/daisyui/card/body/action/DaisyUiCardBodyAction.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCheckbox from '$lib/component/library/daisyui/checkbox/DaisyUiCheckbox.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
import {
	createDoctorSchedule,
	getDoctorSchedule,
	updateDoctorSchedule
} from '$lib/remote/table/information-table/doctor-schedule.remote';
	import {
		getStaff,
		getStaffByIdWithRelations,
		getStaffWithRelations
	} from '$lib/remote/table/information-table/staff.remote';
	import { getWeekday } from '$lib/remote/table/master-table/weekday.remote';
import { StatusColorEnum } from '$lib/model/enum/color.enum';
import { StatusEnum } from '$lib/model/enum/db-link';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import DaisyUiSkeleton from '$lib/component/library/daisyui/skeleton/DaisyUiSkeleton.svelte';
	import type { DoctorScheduleSchema } from '$lib/server/db/schema-type';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
import { dialogService } from '$lib/service/dialog.service.svelte';

	const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
	const MINUTES = ['00', '15', '30', '45'];
	const AM_PM = ['AM', 'PM'] as const;

	const [DAYS, STAFF_LIST] = await Promise.all([
		getWeekday(),
		getStaffWithRelations()
	]);

	const toastService = new ToastService();

	type DaySchedule = {
		checked: boolean;
		fromHour: string;
		fromMin: string;
		fromAmPm: (typeof AM_PM)[number];
		toHour: string;
		toMin: string;
		toAmPm: (typeof AM_PM)[number];
	};

type DoctorScheduleGroup = {
	key: string;
	fromDate: string | null;
	toDate: string | null;
	scheduleIds: number[];
};

let staffId = $state('');
const selectedStaff = $derived(
	STAFF_LIST.find((s) => s.id === staffId) ?? null
);
let doctorSchedules = $state<DoctorScheduleSchema[]>([]);
const scheduleGroups = $derived<DoctorScheduleGroup[]>(
	Object.values(
		doctorSchedules.reduce((acc, s) => {
			const key = `${s.fromDate ?? ''}__${s.toDate ?? ''}`;
			let group = acc[key];
			if (!group) {
				group = {
					key,
					fromDate: s.fromDate ?? null,
					toDate: s.toDate ?? null,
					scheduleIds: []
				};
				acc[key] = group;
			}
			group.scheduleIds.push(s.id);
			return acc;
		}, {} as Record<string, DoctorScheduleGroup>)
	)
);
let fromDate = $state('');
let toDate = $state('');
let slotTimingMinutes = $state('15');
let noEndDate = $state(false);
let editingGroupKey = $state<string | null>(null);
$effect(() => {
	if (noEndDate) toDate = '';
});
$effect(() => {
	void loadDoctorSchedules();
});
	let daySchedules = $state<DaySchedule[]>(
		DAYS.map(() => ({
			checked: false,
			fromHour: '9',
			fromMin: '00',
			fromAmPm: 'AM' as const,
			toHour: '5',
			toMin: '00',
			toAmPm: 'PM' as const
		}))
	);
	let isSaving = $state(false);

	async function loadDoctorSchedules() {
		const id = staffId.trim();
		if (!id) {
			doctorSchedules = [];
			return;
		}
		const all = await getDoctorSchedule();
	doctorSchedules = all.filter(
		(s) =>
			s.staffId === id &&
			s.statusId !== StatusEnum.INACTIVE &&
			s.statusId !== StatusEnum.DELETED
	);
	}

function parseTimeTo12h(time: string | null): {
	hour: string;
	min: string;
	amPm: (typeof AM_PM)[number];
} {
	if (!time) {
		return { hour: '9', min: '00', amPm: 'AM' };
	}
	const [hStr, mStr] = time.split(':');
	let h = Number(hStr) || 0;
	const amPm: (typeof AM_PM)[number] = h >= 12 ? 'PM' : 'AM';
	h = h % 12;
	if (h === 0) h = 12;
	return {
		hour: String(h),
		min: (mStr ?? '00').padStart(2, '0'),
		amPm
	};
}

async function handleEditGroup(group: DoctorScheduleGroup) {
	editingGroupKey = group.key;
	fromDate = group.fromDate ?? '';
	toDate = group.toDate ?? '';
	noEndDate = group.toDate == null;

	// reset day schedules
	daySchedules = DAYS.map(() => ({
		checked: false,
		fromHour: '9',
		fromMin: '00',
		fromAmPm: 'AM',
		toHour: '5',
		toMin: '00',
		toAmPm: 'PM'
	}));

	const groupSchedules = doctorSchedules.filter((s) =>
		group.scheduleIds.includes(s.id)
	);

	for (const s of groupSchedules) {
		const idx = DAYS.findIndex((d) => d.id === s.weekdayId);
		if (idx === -1) continue;
		const fromT = parseTimeTo12h(s.fromShiftTime as string | null);
		const toT = parseTimeTo12h(s.toShiftTime as string | null);
		daySchedules[idx] = {
			checked: true,
			fromHour: fromT.hour,
			fromMin: fromT.min,
			fromAmPm: fromT.amPm,
			toHour: toT.hour,
			toMin: toT.min,
			toAmPm: toT.amPm
		};
	}
}

async function handleDeleteSchedule(group: DoctorScheduleGroup) {
	try {
		const result = await dialogService.open({
			title: 'Inactivate schedule',
			message: 'Are you sure you want to inactivate this schedule?',
			variant: 'confirm'
		} as any);
		if (!result?.confirmed) {
			return;
		}
		const groupSchedules = doctorSchedules.filter((s) =>
			group.scheduleIds.includes(s.id)
		);
		for (const s of groupSchedules) {
			await updateDoctorSchedule({ id: s.id, statusId: StatusEnum.INACTIVE });
		}
		await loadDoctorSchedules();
		toastService.addToast('Schedule inactivated.', StatusColorEnum.SUCCESS);
	} catch (e) {
		toastService.addToast(
			e instanceof Error ? e.message : 'Failed to inactivate schedule.',
			StatusColorEnum.ERROR
		);
	}
}

	function toTime24(
		hour: string,
		min: string,
		amPm: (typeof AM_PM)[number]
	): string {
		let h = parseInt(hour, 10);
		if (amPm === 'PM' && h !== 12) h += 12;
		if (amPm === 'AM' && h === 12) h = 0;
		return `${String(h).padStart(2, '0')}:${min}:00`;
	}

	async function saveDoctorSchedule() {
		if (!staffId?.trim()) {
			toastService.addToast(
				'Please select a doctor.',
				StatusColorEnum.ERROR
			);
			return;
		}
	const hospitalId = 1;
		if (!fromDate?.trim()) {
			toastService.addToast(
				'Please enter From date.',
				StatusColorEnum.ERROR
			);
			return;
		}
		const checkedIndices = daySchedules
			.map((d, i) => (d.checked ? i : -1))
			.filter((i) => i >= 0);
		if (checkedIndices.length === 0) {
			toastService.addToast(
				'Please tick at least one day.',
				StatusColorEnum.ERROR
			);
			return;
		}

		isSaving = true;
		try {
			const isEditing = editingGroupKey !== null;

			if (isEditing) {
				const [origFromRaw, origToRaw] = (editingGroupKey as string).split(
					'__'
				);
				const origFrom = origFromRaw || null;
				const origTo = origToRaw || null;
				const existingGroup = doctorSchedules.filter(
					(s) =>
						s.staffId === staffId.trim() &&
						(s.fromDate ?? null) === origFrom &&
						(s.toDate ?? null) === origTo
				);
				for (const s of existingGroup) {
					await updateDoctorSchedule({
						id: s.id,
						statusId: StatusEnum.INACTIVE
					});
				}
			}

			for (const i of checkedIndices) {
				const day = daySchedules[i];
				const fromShiftTime = toTime24(
					day.fromHour,
					day.fromMin,
					day.fromAmPm
				);
				const toShiftTime = toTime24(
					day.toHour,
					day.toMin,
					day.toAmPm
				);
				await createDoctorSchedule({
					staffId: staffId.trim(),
					hospitalId,
					weekdayId: DAYS[i].id,
					fromDate: fromDate.trim() || null,
					toDate: noEndDate ? null : toDate?.trim() || null,
					fromShiftTime,
					toShiftTime
				});
			}
			editingGroupKey = null;
			await loadDoctorSchedules();
			toastService.addToast(
				isEditing
					? 'Schedule updated.'
					: `Saved ${checkedIndices.length} schedule row(s).`,
				StatusColorEnum.SUCCESS
			);
		} catch (e) {
			toastService.addToast(
				e instanceof Error
					? e.message
					: editingGroupKey
						? 'Failed to update schedule.'
						: 'Failed to save schedule.',
				StatusColorEnum.ERROR
			);
		} finally {
			isSaving = false;
		}
	}
</script>

<DaisyUiCard>
	<DaisyUiCardBody>
		<DaisyUiCardBodyTitle className="mb-5"
			>Doctor Schedule</DaisyUiCardBodyTitle
		>
		<div class="flex flex-col gap-4">
			<!-- Row 1: Doctor -->
			<div
				class="flex gap-4 md:flex-col lg:flex-row lg:justify-between"
			>
				<div class="flex flex-col gap-4">
					<div class="flex flex-wrap items-center gap-x-10 gap-y-4">
						<div class="flex items-center gap-3">
							<p class="min-w-[4.5rem]">Doctor</p>
							<DaisyUiSelect
								optionHeader="Select a Doctor ..."
								bind:value={staffId}
								className="w-[14rem] min-w-[14rem]"
							>
								{#each STAFF_LIST as staff (staff.id)}
									<option value={staff.id}>
										{StringUtil.fullNameWithTitle(
											staff.title?.name,
											staff.firstName,
											staff.middleName,
											staff.lastName
										)}
									</option>
								{/each}
							</DaisyUiSelect>
						</div>
					</div>

			<!-- Row 2: From | To (same row) -->
					<div class="flex flex-wrap items-start gap-x-10 gap-y-4">
						<div class="flex items-center gap-3">
							<p class="min-w-[4.5rem]">
								From <span class="text-error">*</span>
							</p>
							<DaisyUiInputField
								inputType="date"
								inputPlaceholderText="DD/MM/YYYY"
								bind:value={fromDate}
								className="w-[14rem] min-w-[14rem]"
							/>
						</div>
						<div class="flex items-start gap-3">
							<p class="min-w-[4.5rem] pt-2">
								To <span class="text-error">*</span>
							</p>
							<div
								class="flex w-[14rem] min-w-[14rem] flex-col gap-2"
							>
								<DaisyUiInputField
									inputType="date"
									inputPlaceholderText="DD/MM/YYYY"
									bind:value={toDate}
									className="w-full"
									disabled={noEndDate}
								/>
								<label
									class="flex w-fit cursor-pointer items-center gap-2"
								>
									<DaisyUiCheckbox bind:checked={noEndDate} />
									<span>No End Date</span>
								</label>
							</div>
						</div>
					</div>
				</div>

				<!-- Schedule Table -->
				<DaisyUiCard className="">
					{#if selectedStaff}
						<DaisyUiCardBody className="">
							<div class="overflow-x-auto lg:-mt-16">
								<h1
									class="text-center text-xl font-bold text-primary"
								>
									Doctor Scheduled Date
								</h1>
								<div class="flex gap-5 text-left">
									<DaisyUiSkeleton
										className="w-24 h-24 rounded-full"
									/>
									{#if selectedStaff}
										<div class="flex flex-col">
											<h2 class="mt-3 text-lg font-semibold">
												{StringUtil.fullNameWithTitle(
													selectedStaff.title?.name,
													selectedStaff.firstName,
													selectedStaff.middleName,
													selectedStaff.lastName
												)}
											</h2>
											<p class="text-sm text-base-content/70">
												{selectedStaff.specialization?.name ??
													'No specialization'}
											</p>
										</div>
									{/if}
								</div>
								<div class="max-h-42 overflow-auto">
									<DaisyUiTable
										className="d-table d-table-zebra d-table-sm text-center"
									>
										<DaisyUiTableHeader>
											<tr>
												<th>Start Date</th>
												<th>End Date</th>
												<th>Actions</th>
											</tr>
										</DaisyUiTableHeader>
										<DaisyUiTableBody className="">
										{#if scheduleGroups.length === 0}
												<tr>
													<td
														colspan="3"
														class="text-sm text-base-content/60"
													>
														No schedules found.
													</td>
												</tr>
											{:else}
												{#each scheduleGroups as group (group.key)}
													<tr>
														<td>
															{group.fromDate ?? '-'}
														</td>
														<td>
															{group.toDate ?? 'No End Date'}
														</td>
														<td>
															<DaisyUiTooltip
																tooltipText="edit data"
																className="d-tooltip-left d-tooltip-accent"
															>
																<DaisyUiButton
																	className=" d-btn-ghost d-btn-sm d-btn-accent"
																	onClick={() => handleEditGroup(group)}
																>
																	<LucidePencil className="size-5" />
																</DaisyUiButton>
															</DaisyUiTooltip>
															<DaisyUiTooltip
																tooltipText="inactivate schedule"
																className="d-tooltip-left d-tooltip-error"
															>
																<DaisyUiButton
																	className="d-btn-ghost d-btn-sm d-btn-error"
																	onClick={() => handleDeleteSchedule(group)}
																>
																	<LucideTrash2 className="size-5 " />
																</DaisyUiButton>
															</DaisyUiTooltip>
														</td>
													</tr>
												{/each}
											{/if}
										</DaisyUiTableBody>
									</DaisyUiTable>
								</div>
							</div>
						</DaisyUiCardBody>
					{/if}
				</DaisyUiCard>
			</div>

			<!-- Row 2: Slot Timing -->
			<div class="flex flex-wrap items-center gap-x-8 gap-y-4">
				<div class="flex items-center gap-2">
					<p>
						Slot Timing
						<span class="text-error">*</span>
					</p>
					<DaisyUiInputField
						inputType="number"
						bind:value={slotTimingMinutes}
						className="d-input-sm w-20 text-center"
					/>
					<span class="text-base-content/70">min</span>
				</div>
			</div>

			<!-- Daily Schedule table -->
			<div class="overflow-x-auto">
				<DaisyUiTable className="d-table d-table-zebra d-table-sm">
					<DaisyUiTableHeader>
						<tr>
							<th>Days (Include)</th>
							<th
								>From Time [hh:mm] <span class="text-error">*</span
								></th
							>
							<th
								>To Time [hh:mm] <span class="text-error">*</span></th
							>
						</tr>
					</DaisyUiTableHeader>
					<DaisyUiTableBody>
						{#each DAYS as day, i (day.id)}
							<tr>
								<td>
									<label
										class="flex cursor-pointer items-center gap-2"
									>
										<DaisyUiCheckbox
											bind:checked={daySchedules[i].checked}
										/>
										<span>{day.name}</span>
									</label>
								</td>
								<td>
									<div class="flex items-center gap-1">
										<select
											class="d-select w-16 d-select-sm"
											bind:value={daySchedules[i].fromHour}
										>
											{#each HOURS as h (h)}
												<option value={h}>{h}</option>
											{/each}
										</select>
										<span>:</span>
										<select
											class="d-select w-16 d-select-sm"
											bind:value={daySchedules[i].fromMin}
										>
											{#each MINUTES as m (m)}
												<option value={m}>{m}</option>
											{/each}
										</select>
										<span>:</span>
										<select
											class="d-select w-16 d-select-sm"
											bind:value={daySchedules[i].fromAmPm}
										>
											{#each AM_PM as ap (ap)}
												<option value={ap}>{ap}</option>
											{/each}
										</select>
									</div>
								</td>
								<td>
									<div class="flex items-center gap-1">
										<select
											class="d-select w-16 d-select-sm"
											bind:value={daySchedules[i].toHour}
										>
											{#each HOURS as h (h)}
												<option value={h}>{h}</option>
											{/each}
										</select>
										<span>:</span>
										<select
											class="d-select w-16 d-select-sm"
											bind:value={daySchedules[i].toMin}
										>
											{#each MINUTES as m (m)}
												<option value={m}>{m}</option>
											{/each}
										</select>
										<span>:</span>
										<select
											class="d-select w-16 d-select-sm"
											bind:value={daySchedules[i].toAmPm}
										>
											{#each AM_PM as ap (ap)}
												<option value={ap}>{ap}</option>
											{/each}
										</select>
									</div>
								</td>
							</tr>
						{/each}
					</DaisyUiTableBody>
				</DaisyUiTable>
			</div>
		</div>
		<DaisyUiCardBodyAction>
			<DaisyUiButton
				className="d-btn-primary d-btn-wide mt-5"
				onClick={() => saveDoctorSchedule()}
				disabled={isSaving}
			>
				{isSaving
					? editingGroupKey
						? 'Updating…'
						: 'Saving…'
					: editingGroupKey
						? 'Update'
						: 'Save'}
			</DaisyUiButton>
		</DaisyUiCardBodyAction>
	</DaisyUiCardBody>
</DaisyUiCard>
