<script lang="ts">
	import LDoctorAppointmentCalendar from '$lib/component/local/private/heka/appointment/doctor-appointment/LDoctorAppointmentCalendar.svelte';
	import LDoctorAppointmentProfileBar from '$lib/component/local/private/heka/appointment/doctor-appointment/LDoctorAppointmentProfileBar.svelte';
	import LDoctorAppointmentStatistics from '$lib/component/local/private/heka/appointment/doctor-appointment/LDoctorAppointmentStatistics.svelte';
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

	let doctorList = $state<StaffWithRelations[]>([]);
	let doctorSchedules = $state<DoctorScheduleSchema[]>([]);
	let selectDate = $state(new Date().toISOString().slice(0, 10));
	let viewBy = $state<'day' | 'week' | 'month'>('day');
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
		doctorList = await getDoctorStaffList();
	});

	$effect(() => {
		const id = selectedDoctorId.trim();
		if (!id) {
			doctorSchedules = [];
			return;
		}
		getDoctorSchedule().then((all) => {
			doctorSchedules = all.filter(
				(s) =>
					String(s.staffId) === String(id) &&
					s.statusId !== StatusEnum.INACTIVE &&
					s.statusId !== StatusEnum.DELETED
			);
		});
	});
</script>

<section class="flex flex-col gap-5 lg:flex-row">
	<div class="min-w-96">
		<LDoctorAppointmentProfileBar
			{doctorList}
			bind:selectedDoctorId
			bind:viewBy
			onDateChange={(date) => {
				selectDate = date;
			}}
		/>
	</div>
	<div class="min-w-0 w-full">
		<LDoctorAppointmentCalendar
			{selectDate}
			{viewBy}
			selectedDoctorName={selectedDoctorName}
			{scheduleSlots}
		/>
		<LDoctorAppointmentStatistics />
	</div>
</section>
