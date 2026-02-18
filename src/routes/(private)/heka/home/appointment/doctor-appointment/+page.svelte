<script lang="ts">
	import LDoctorAppointmentCalendar from '$lib/component/local/private/heka/appointment/doctor-appointment/LDoctorAppointmentCalendar.svelte';
	import LDoctorAppointmentProfileBar from '$lib/component/local/private/heka/appointment/doctor-appointment/LDoctorAppointmentProfileBar.svelte';
	import LDoctorAppointmentStatistics from '$lib/component/local/private/heka/appointment/doctor-appointment/LDoctorAppointmentStatistics.svelte';
	import {
		getDoctorStaffList,
		type StaffWithRelations
	} from '$lib/remote/table/information-table/staff.remote';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';

	let doctorList = $state<StaffWithRelations[]>([]);
	let selectDate = $state('');

	const lifeCycleutil = new LifeCycleUtil();
	lifeCycleutil.onMount(async () => {
		doctorList = await getDoctorStaffList();
	});
</script>

<section class="flex flex-col gap-5 lg:flex-row">
	<LDoctorAppointmentProfileBar
		{doctorList}
		onDateChange={(date) => {
			selectDate = date;
		}}
	/>
	<div class="w-full">
		<LDoctorAppointmentCalendar {selectDate} />
		<LDoctorAppointmentStatistics />
	</div>
</section>
