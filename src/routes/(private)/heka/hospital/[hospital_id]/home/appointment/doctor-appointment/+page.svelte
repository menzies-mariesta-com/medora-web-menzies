<script lang="ts">
	import LDoctorAppointmentCalendar from '$lib/component/own/local/private/heka/appointment/doctor-appointment/LDoctorAppointmentCalendar.svelte';
	import LDoctorAppointmentProfileBar from '$lib/component/own/local/private/heka/appointment/doctor-appointment/LDoctorAppointmentProfileBar.svelte';
	import LDoctorAppointmentStatistics from '$lib/component/own/local/private/heka/appointment/doctor-appointment/LDoctorAppointmentStatistics.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import LCancelAppointmentHistoryDialogContent from '$lib/component/own/local/private/heka/appointment/doctor-appointment/LCancelAppointmentHistoryDialogContent.svelte';
	import type { AppointmentWithRelations } from '$lib/remote/table/information-table/appointment.remote';
	import { refetchAppointmentWithRelations } from '$lib/tool/remote/table/information-table/appointment.http.tool.svelte';
	import { getDoctorSchedule } from '$lib/tool/remote/table/information-table/doctor-schedule.http.tool.svelte';
	import {
		createAppointmentBlock,
		deleteAppointmentBlock,
		getAppointmentBlock,
		updateAppointmentBlock
	} from '$lib/tool/remote/table/information-table/appointment-block.http.tool.svelte';
	import { getDoctorStaffList } from '$lib/tool/remote/table/information-table/staff.http.tool.svelte';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import type { AppointmentBlockSchema } from '$lib/server/db/schema-type';
	import type { DoctorScheduleSchema } from '$lib/server/db/schema-type';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { page } from '$app/state';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: undefined
	);
	const navbarSelectedBranchId = $derived(
		typeof page.data?.selectedBranchId === 'string'
			? page.data.selectedBranchId
			: undefined
	);
	const isAllBranchMode = $derived(
		navbarSelectedBranchId === '__all__'
	);

	let doctorList = $state<any[]>([]);
	let doctorSchedules = $state<DoctorScheduleSchema[]>([]);
	let appointments = $state<AppointmentWithRelations[]>([]);
	/** Invalidates stale list fetches so a slow $effect response cannot overwrite after create/edit refresh. */
	let appointmentsFetchGen = 0;
	let isCancelHistoryOpen = $state(false);
	let isCancelHistoryLoading = $state(false);
	let isAppointmentToolbarRefreshing = $state(false);
	let selectDate = $state(new Date().toISOString().slice(0, 10));
	let viewBy = $state<'day' | 'week' | 'month'>('day');
	let timeFormat = $state<'24h' | '12h'>('24h');
	let selectedDoctorId = $state('');
	let selectedAppointmentBranchId = $state('');
	/** Appointment blocks from DB for the selected doctor (and hospital). */
	let appointmentBlocks = $state<AppointmentBlockSchema[]>([]);

	const dateTimeUtil = new DateTimeUtil();

	/** Local YYYY-MM-DD so visible dates match calendar column dates. */
	function toLocalDateString(d: Date): string {
		const c = dateTimeUtil.getDateComponents(d);
		return `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;
	}

	const selectedDoctorName = $derived.by(() => {
		const doctor = doctorList.find(
			(d) => String(d.id) === selectedDoctorId
		);
		return doctor
			? StringUtil.fullNameWithTitle(
					doctor.title?.name ?? '',
					doctor.firstName,
					doctor.middleName,
					doctor.lastName
				)
			: '';
	});
	const doctorBranchOptions = $derived.by(() => {
		const doctor = doctorList.find(
			(d) => String(d.id) === selectedDoctorId
		);
		if (!doctor) return [];
		return (doctor.staffBranches ?? [])
			.map((sb: any) => sb.branch)
			.filter((b: any): b is NonNullable<typeof b> => b != null)
			.map((b: any) => ({ id: b.id, name: b.name ?? null }));
	});
	const effectiveBranchId = $derived.by(() => {
		if (!isAllBranchMode) {
			return navbarSelectedBranchId &&
				navbarSelectedBranchId !== '__all__'
				? navbarSelectedBranchId
				: undefined;
		}
		return selectedAppointmentBranchId || undefined;
	});
	$effect(() => {
		if (!isAllBranchMode) {
			selectedAppointmentBranchId = effectiveBranchId ?? '';
			return;
		}
		const options = doctorBranchOptions;
		if (options.length === 0) {
			selectedAppointmentBranchId = '';
			return;
		}
		if (
			!options.some((b: any) => b.id === selectedAppointmentBranchId)
		) {
			selectedAppointmentBranchId = options[0].id;
		}
	});

	/** Visible calendar dates (YYYY-MM-DD, local) for current selectDate + viewBy. */
	const visibleDates = $derived.by(() => {
		if (!selectDate) return [];
		const date = new Date(selectDate + 'T12:00:00');
		if (isNaN(date.getTime())) return [];
		if (viewBy === 'day') return [toLocalDateString(date)];
		if (viewBy === 'week') {
			const weekStart = dateTimeUtil.getWeekStartDate(date, 0);
			return Array.from({ length: 7 }, (_, i) =>
				toLocalDateString(dateTimeUtil.addDays(weekStart, i))
			);
		}
		const startOfMonth = dateTimeUtil.startOfMonth(date);
		const year = startOfMonth.getFullYear();
		const monthIndex = startOfMonth.getMonth();
		const daysInMonth = dateTimeUtil.getDaysInMonth(year, monthIndex);
		return Array.from({ length: daysInMonth }, (_, i) =>
			toLocalDateString(dateTimeUtil.addDays(startOfMonth, i))
		);
	});

	/** Default interval for time column when doctor has no schedule. Always show full 24h grid. */
	const DEFAULT_SLOT_DURATION_MINUTES = 15;

	/** Slot duration (minutes) for calendar time column. From doctor schedule when present, else default so time column always shows full day. */
	const slotDurationMinutes = $derived.by(() => {
		const schedules = doctorSchedules.filter(
			(s) =>
				String(s.staffId) === selectedDoctorId &&
				s.statusId !== StatusEnum.INACTIVE &&
				s.statusId !== StatusEnum.DELETED
		);
		const first = schedules[0] as
			| (DoctorScheduleSchema & {
					slotDurationMinutes?: number | null;
			  })
			| undefined;
		const mins = first?.slotDurationMinutes;
		if (mins != null && mins >= 1 && mins <= 60) return mins;
		return DEFAULT_SLOT_DURATION_MINUTES;
	});

	/** Map statusTagging code to calendar slot state (unconfirmed → confirmed → check-in, plus cancel). */
	function toSlotState(
		code: string | null | undefined
	): 'unconfirmed' | 'confirmed' | 'check-in' | 'cancel' {
		const c = (code ?? '')
			.trim()
			.toLowerCase()
			.replace(/[\s-]/g, '_');
		if (c === 'check_in') return 'check-in';
		if (c === 'confirmed') return 'confirmed';
		if (c === 'cancel' || c === 'cancelled') return 'cancel';
		return 'unconfirmed';
	}

	const cancelAppointments = $derived.by(() => {
		if (!selectedDoctorId.trim()) return [];
		return appointments
			.filter((a) => {
				if (String(a.staffId) !== selectedDoctorId) return false;
				if (effectiveBranchId) {
					if (String(a.branchId) !== String(effectiveBranchId))
						return false;
				}
				return (
					toSlotState(
						a.statusTagging?.code ?? a.statusTagging?.name
					) === 'cancel'
				);
			})
			.sort((a, b) => {
				const d1 = String(a.appointmentDate ?? '');
				const d2 = String(b.appointmentDate ?? '');
				const t1 = String(a.fromTime ?? '');
				const t2 = String(b.fromTime ?? '');
				return d2.localeCompare(d1) || t2.localeCompare(t1);
			});
	});

	function listParamsForAppointments():
		| { hospitalId: string; branchId: string }
		| { hospitalId: string }
		| undefined {
		const hid = hospitalId ?? undefined;
		const bid = effectiveBranchId ?? undefined;
		if (!hid) return undefined;
		if (bid) return { hospitalId: hid, branchId: bid };
		return { hospitalId: hid };
	}

	/** After create/edit/cancel/delete: bump generation so this load wins over any in-flight $effect fetch, then refetch. */
	async function reloadCalendarAfterAppointmentMutation(): Promise<void> {
		appointmentsFetchGen++;
		await loadAppointmentsForCalendar();
	}

	/** Single loader for calendar + cancel history; avoids stale $effect fetches overwriting after cancel/edit. */
	async function loadAppointmentsForCalendar(): Promise<void> {
		const id = selectedDoctorId.trim();
		if (!id) {
			appointmentsFetchGen++;
			appointments = [];
			return;
		}
		const myGen = ++appointmentsFetchGen;
		const listParams = listParamsForAppointments();
		const all = (await refetchAppointmentWithRelations(
			listParams
		)) as AppointmentWithRelations[];
		if (myGen !== appointmentsFetchGen) return;
		appointments = all as AppointmentWithRelations[];
	}

	async function refreshAppointmentsToolbar() {
		if (!selectedDoctorId.trim()) return;
		const id = selectedDoctorId.trim();
		const hid = hospitalId ?? undefined;
		isAppointmentToolbarRefreshing = true;
		try {
			await loadAppointmentsForCalendar();
			const blocks = await getAppointmentBlock({
				staffId: id,
				hospitalId: hid ?? undefined
			});
			appointmentBlocks = blocks as AppointmentBlockSchema[];
		} finally {
			isAppointmentToolbarRefreshing = false;
		}
	}

	async function openCancelHistory() {
		if (!selectedDoctorId.trim()) return;
		isCancelHistoryOpen = true;
		isCancelHistoryLoading = true;
		try {
			await loadAppointmentsForCalendar();
		} finally {
			isCancelHistoryLoading = false;
		}
	}

	/** Appointments for selected doctor in visible date range → calendar highlights by state and patient name. */
	const appointmentSlots = $derived.by(() => {
		const dateSet = new Set(visibleDates);
		return (
			appointments
				.filter(
					(a) =>
						String(a.staffId) === selectedDoctorId &&
						(effectiveBranchId
							? String(a.branchId) === effectiveBranchId
							: true) &&
						a.statusId !== StatusEnum.DELETED &&
						a.appointmentDate != null &&
						dateSet.has(String(a.appointmentDate).slice(0, 10))
				)
				.map((a) => ({
					appointmentId: a.id,
					date: String(a.appointmentDate).slice(0, 10),
					startTime: String(a.fromTime ?? '').trim(),
					endTime: String(a.toTime ?? '').trim(),
					patientCode: a.patient?.code?.trim() ?? '',
					patientName:
						a.patientName?.trim() ??
						(a.patient
							? StringUtil.patientDisplayName(a.patient as any)
							: ''),
					slotState: toSlotState(
						a.statusTagging?.code ?? a.statusTagging?.name
					)
				}))
				// Cancelled appointments should not appear in the timeline and must
				// not block creating a new appointment in the same slot.
				.filter(
					(s) => s.startTime && s.endTime && s.slotState !== 'cancel'
				)
		);
	});

	/** Blocked slots for the calendar (from DB), with blockId for edit/delete. */
	const blockSlots = $derived.by(() =>
		appointmentBlocks
			.filter(
				(b) =>
					b.blockDate != null &&
					b.fromTime != null &&
					b.toTime != null
			)
			.map((b) => ({
				blockId: b.id,
				date: String(b.blockDate).slice(0, 10),
				startTime: String(b.fromTime).trim(),
				endTime: String(b.toTime).trim(),
				remark: String((b as any).remark ?? '').trim()
			}))
	);

	/** Expand doctor schedules into (date, startTime, endTime) slots for visible dates. WeekdayId 1=Sun, 7=Sat. */
	const scheduleSlots = $derived.by(() => {
		const slots: {
			date: string;
			startTime: string;
			endTime: string;
		}[] = [];
		const schedules = doctorSchedules.filter(
			(s) =>
				String(s.staffId) === String(selectedDoctorId) &&
				s.statusId !== StatusEnum.INACTIVE &&
				s.statusId !== StatusEnum.DELETED
		);
		for (const dateStr of visibleDates) {
			const d = new Date(dateStr + 'T12:00:00');
			const weekdayId = d.getDay() + 1; // 0=Sun -> 1, 1=Mon -> 2, ...
			for (const sched of schedules) {
				if (Number(sched.weekdayId) !== weekdayId) continue;
				const fromDate =
					sched.fromDate != null
						? String(sched.fromDate).slice(0, 10)
						: '';
				const toDate =
					sched.toDate != null
						? String(sched.toDate).slice(0, 10)
						: null;
				if (fromDate && dateStr < fromDate) continue;
				if (toDate != null && dateStr > toDate) continue;
				const startTime = String(sched.fromShiftTime ?? '').trim();
				const endTime = String(sched.toShiftTime ?? '').trim();
				if (startTime && endTime)
					slots.push({ date: dateStr, startTime, endTime });
			}
		}
		return slots;
	});

	const lifeCycleutil = new LifeCycleUtil();
	lifeCycleutil.onMount(async () => {
		const hid = hospitalId ?? undefined;
		doctorList = await getDoctorStaffList(
			hid
				? {
						hospitalId: hid,
						branchId: effectiveBranchId ?? undefined
					}
				: undefined
		);
	});

	lifeCycleutil.onDestroy(() => {});

	$effect(() => {
		const id = selectedDoctorId.trim();
		const hid = hospitalId ?? undefined;
		const bid = effectiveBranchId ?? undefined;
		if (!id) {
			appointmentsFetchGen++;
			doctorSchedules = [];
			appointments = [];
			appointmentBlocks = [];
			return;
		}
		getDoctorSchedule(
			hid ? { hospitalId: hid, branchId: bid } : undefined
		).then((all: any[]) => {
			doctorSchedules = all.filter(
				(s: any) =>
					String(s.staffId) === String(id) &&
					s.statusId !== StatusEnum.INACTIVE &&
					s.statusId !== StatusEnum.DELETED
			);
		});
		void loadAppointmentsForCalendar();
		getAppointmentBlock({
			staffId: id,
			hospitalId: hid ?? undefined
		}).then((all: any[]) => {
			appointmentBlocks = all as any;
		});
	});
</script>

<section class="flex flex-col gap-5 lg:flex-row">
	<div class="min-w-96">
		<LDoctorAppointmentProfileBar
			{doctorList}
			bind:selectedDoctorId
			bind:selectedBranchId={selectedAppointmentBranchId}
			branchOptions={doctorBranchOptions}
			branchLocked={!isAllBranchMode}
			branchIdForSearch={effectiveBranchId}
			bind:viewBy
			bind:timeFormat
			onDateChange={(date) => {
				selectDate = date;
			}}
		/>
	</div>
	<div class="w-full min-w-0">
		<div class="mb-3 flex justify-end">
			<DaisyUiButton
				className="d-btn-ghost d-btn-sm"
				disabled={!selectedDoctorId.trim()}
				onClick={openCancelHistory}
			>
				Cancel appointment history
			</DaisyUiButton>
		</div>
		<LDoctorAppointmentCalendar
			{selectDate}
			{viewBy}
			{timeFormat}
			{selectedDoctorName}
			{selectedDoctorId}
			activeBranchId={effectiveBranchId ?? null}
			{scheduleSlots}
			{appointmentSlots}
			{blockSlots}
			{slotDurationMinutes}
			onAppointmentCreated={reloadCalendarAfterAppointmentMutation}
			onRefreshAppointments={refreshAppointmentsToolbar}
			isRefreshAppointmentsLoading={isAppointmentToolbarRefreshing}
			onBlockCreated={async (block) => {
				try {
					const created = await createAppointmentBlock({
						staffId: selectedDoctorId,
						hospitalId: hospitalId ?? undefined,
						blockDate: block.date,
						fromTime: block.startTime,
						toTime: block.endTime,
						remark: (block as any).remark ?? ''
					});
					appointmentBlocks = [...appointmentBlocks, created];
				} catch {
					// Error already surfaced by calendar toast or could add toast here
				}
			}}
			onBlockUpdated={async (payload) => {
				try {
					const updated = await updateAppointmentBlock({
						id: payload.id,
						blockDate: payload.date,
						fromTime: payload.startTime,
						toTime: payload.endTime,
						remark: (payload as any).remark ?? ''
					});
					appointmentBlocks = appointmentBlocks.map((b) =>
						b.id === payload.id ? updated : b
					);
				} catch {
					// toast on error if desired
				}
			}}
			onBlockDeleted={async (blockId) => {
				try {
					await deleteAppointmentBlock({ id: blockId });
					appointmentBlocks = appointmentBlocks.filter(
						(b) => b.id !== blockId
					);
				} catch {
					// toast on error if desired
				}
			}}
		/>
		<LDoctorAppointmentStatistics />
		<LCancelAppointmentHistoryDialogContent
			open={isCancelHistoryOpen}
			onClose={() => (isCancelHistoryOpen = false)}
			items={cancelAppointments}
			isLoading={isCancelHistoryLoading}
		/>
	</div>
</section>
