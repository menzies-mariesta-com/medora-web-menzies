<script lang="ts">
	import CallyDateCalendar from '$lib/component/library/cally/CallyDateCalendar.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiSkeleton from '$lib/component/library/daisyui/skeleton/DaisyUiSkeleton.svelte';
	import type { StaffWithRelations } from '$lib/remote/table/information-table/staff.remote';
	import { StringUtil } from '$lib/util/string.util.svelte';

	let { doctorList, onDateChange } = $props<{
		doctorList: StaffWithRelations[];
		onDateChange?: (date: string) => void;
	}>();

	let selectedDate = $state(new Date().toISOString().slice(0, 10));

	function handleCalendarChange(date: string) {
		selectedDate = date;
		if (typeof onDateChange === 'function') {
			onDateChange(date);
		}
	}

	import CallyRangeCalendar from '$lib/component/library/cally/CallyRangeCalendar.svelte';

	let fromDate = $state('');
	let toDate = $state('');
</script>

<DaisyUiCard>
	<DaisyUiCardBody className="w-full gap-5">
		<DaisyUiCardBodyTitle>Doctor :</DaisyUiCardBodyTitle>

		<DaisyUiSelect
			optionHeader="Select a doctor ..."
			className="w-full"
		>
			{#each doctorList as doctor (doctor.id)}
				<option value={doctor.id}>
					{StringUtil.fullNameWithTitle(
						doctor.title.name,
						doctor.firstName,
						doctor.middleName,
						doctor.lastName
					)}
				</option>
			{/each}
		</DaisyUiSelect>
		<div
			class="flex min-w-0 items-center gap-10 rounded-2xl bg-info/10 px-3 py-5"
		>
			<DaisyUiSkeleton
				className="h-32 w-32 shrink-0 rounded-full bg-info-content/10"
			/>
			<div class="flex min-w-0 flex-1 flex-col gap-3">
				<DaisyUiSkeleton className="h-9 w-full bg-info-content/10" />
				<DaisyUiSkeleton className="h-7 w-full bg-info-content/10" />
			</div>
		</div>

		<CallyDateCalendar
			bind:value={selectedDate}
			onChange={handleCalendarChange}
			showOutsideDays={true}
			className="w-full rounded-box border border-base-300 bg-base-100 shadow-lg"
		/>

		<CallyRangeCalendar
			bind:from={fromDate}
			bind:to={toDate}
			months={1}
			showOutsideDays={true}
			className="w-full rounded-box border border-base-300 bg-base-100 shadow-lg"
			onChange={({ from, to }) => {
				console.log('range changed', from, to);
			}}
		/>
	</DaisyUiCardBody>
</DaisyUiCard>
