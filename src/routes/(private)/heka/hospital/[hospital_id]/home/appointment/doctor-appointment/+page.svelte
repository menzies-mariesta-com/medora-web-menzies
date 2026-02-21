<script lang="ts">
	import LDoctorAppointmentCalendar from '$lib/component/local/private/heka/appointment/doctor-appointment/LDoctorAppointmentCalendar.svelte';
	import LDoctorAppointmentProfileBar from '$lib/component/local/private/heka/appointment/doctor-appointment/LDoctorAppointmentProfileBar.svelte';
	import LDoctorAppointmentStatistics from '$lib/component/local/private/heka/appointment/doctor-appointment/LDoctorAppointmentStatistics.svelte';
	import { getAppointment } from '$lib/remote/table/information-table/appointment.remote';
	import { getDoctorSchedule } from '$lib/remote/table/information-table/doctor-schedule.remote';
	import {
		getDoctorStaffList,
		type StaffWithRelations
	} from '$lib/remote/table/information-table/staff.remote';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import type { DoctorScheduleSchema } from '$lib/server/db/schema-type';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { page } from '$app/state';

	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' ? Number(page.params.hospital_id) : undefined
	);

	let doctorList = $state<StaffWithRelations[]>([]);
	let doctorSchedules = $state<DoctorScheduleSchema[]>([]);
	let appointments = $state<Awaited<ReturnType<typeof getAppointment>>>([]);
	let selectDate = $state(new Date().toISOString().slice(0, 10));
	let viewBy = $state<'day' | 'week' | 'month'>('day');
	let timeFormat = $state<'24h' | '12h'>('24h');
	let selectedDoctorId = $state('');

	const dateTimeUtil = new DateTimeUtil();

	/** Local YYYY-MM-DD so visible dates match calendar column dates. */
	function toLocalDateString(d: Date): string {
		const c = dateTimeUtil.getDateComponents(d);
		return `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;
	}

	const selectedDoctorName = $derived.by(() => {
		const doctor = doctorList.find((d) => String(d.id) === selectedDoctorId);
		return doctor
			? StringUtil.fullNameWithTitle(
					doctor.title?.name ?? '',
					doctor.firstName,
					doctor.middleName,
					doctor.lastName
				)
			: '';
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
		const first = schedules[0] as (DoctorScheduleSchema & { slotDurationMinutes?: number | null }) | undefined;
		const mins = first?.slotDurationMinutes;
		if (mins != null && mins >= 1 && mins <= 60) return mins;
		return DEFAULT_SLOT_DURATION_MINUTES;
	});

	/** Appointments for selected doctor in visible date range → calendar highlights with bg-primary and patient name. */
	const appointmentSlots = $derived.by(() => {
		const dateSet = new Set(visibleDates);
		return appointments
			.filter(
				(a) =>
					String(a.staffId) === selectedDoctorId &&
					a.statusId !== StatusEnum.DELETED &&
					a.appointmentDate != null &&
					dateSet.has(String(a.appointmentDate).slice(0, 10))
			)
			.map((a) => ({
				appointmentId: a.id,
				date: String(a.appointmentDate).slice(0, 10),
				startTime: String(a.fromTime ?? '').trim(),
				endTime: String(a.toTime ?? '').trim(),
				patientName: a.patientName?.trim() ?? ''
			}))
			.filter((s) => s.startTime && s.endTime);
	});

	/** Expand doctor schedules into (date, startTime, endTime) slots for visible dates. WeekdayId 1=Sun, 7=Sat. */
	const scheduleSlots = $derived.by(() => {
		const slots: { date: string; startTime: string; endTime: string }[] = [];
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
				const fromDate = sched.fromDate != null ? String(sched.fromDate).slice(0, 10) : '';
				const toDate = sched.toDate != null ? String(sched.toDate).slice(0, 10) : null;
				if (fromDate && dateStr < fromDate) continue;
				if (toDate != null && dateStr > toDate) continue;
				const startTime = String(sched.fromShiftTime ?? '').trim();
				const endTime = String(sched.toShiftTime ?? '').trim();
				if (startTime && endTime) slots.push({ date: dateStr, startTime, endTime });
			}
		}
		return slots;
	});

	const lifeCycleutil = new LifeCycleUtil();
	lifeCycleutil.onMount(async () => {
		const hid = hospitalId != null && Number.isInteger(hospitalId) ? hospitalId : undefined;
		doctorList = await getDoctorStaffList(hid != null ? { hospitalId: hid } : undefined);
	});

	$effect(() => {
		const id = selectedDoctorId.trim();
		const hid = hospitalId != null && Number.isInteger(hospitalId) ? hospitalId : undefined;
		if (!id) {
			doctorSchedules = [];
			appointments = [];
			return;
		}
		getDoctorSchedule(hid != null ? { hospitalId: hid } : undefined).then((all) => {
			doctorSchedules = all.filter(
				(s) =>
					String(s.staffId) === String(id) &&
					s.statusId !== StatusEnum.INACTIVE &&
					s.statusId !== StatusEnum.DELETED
			);
		});
		getAppointment().then((all) => {
			appointments = all;
		});
	});
</script>

<section class="flex flex-col gap-5 lg:flex-row">
	<div class="min-w-96">
		<LDoctorAppointmentProfileBar
			{doctorList}
			bind:selectedDoctorId
			bind:viewBy
			bind:timeFormat
			onDateChange={(date) => {
				selectDate = date;
			}}
		/>
	</div>
	<div class="min-w-0 w-full">
		<LDoctorAppointmentCalendar
			{selectDate}
			{viewBy}
			{timeFormat}
			selectedDoctorName={selectedDoctorName}
			selectedDoctorId={selectedDoctorId}
			{scheduleSlots}
			{appointmentSlots}
			{slotDurationMinutes}
			onAppointmentCreated={async () => {
				appointments = await getAppointment();
			}}
		/>
		<LDoctorAppointmentStatistics />
	</div>
</section>
