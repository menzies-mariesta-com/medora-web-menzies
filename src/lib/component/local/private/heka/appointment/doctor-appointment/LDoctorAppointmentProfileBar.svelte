<script lang="ts">
	import CallyDateCalendar from '$lib/component/library/cally/CallyDateCalendar.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiFilter from '$lib/component/library/daisyui/filter/DaisyUiFilter.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiSkeleton from '$lib/component/library/daisyui/skeleton/DaisyUiSkeleton.svelte';
	import type { StaffWithRelations } from '$lib/remote/table/information-table/staff.remote';
	import { StringUtil } from '$lib/util/string.util.svelte';

	let { doctorList, selectedDoctorId = $bindable(''), viewBy = $bindable('day'), onDateChange } = $props<{
		doctorList: StaffWithRelations[];
		selectedDoctorId?: string;
		viewBy?: 'day' | 'week' | 'month';
		onDateChange?: (date: string) => void;
	}>();

	let selectedDate = $state(new Date().toISOString().slice(0, 10));

	function handleCalendarChange(date: string) {
		selectedDate = date;
		if (typeof onDateChange === 'function') {
			onDateChange(date);
		}
	}
</script>

<DaisyUiCard>
	<DaisyUiCardBody className="w-full gap-5">
		<DaisyUiCardBodyTitle>Doctor :</DaisyUiCardBodyTitle>

		<DaisyUiSelect
			bind:value={selectedDoctorId}
			optionHeader="Select a doctor ..."
			className="w-full"
		>
			{#each doctorList as doctor (doctor.id)}
				<option value={String(doctor.id)}>
					{StringUtil.fullNameWithTitle(
						doctor.title.name,
						doctor.firstName,
						doctor.middleName,
						doctor.lastName
					)}
				</option>
			{/each}
		</DaisyUiSelect>
		<div class="flex items-center justify-between">
			<p class="font-bold">View By</p>
			<DaisyUiFilter className="gap-1">
				<DaisyUiInputField
					className="d-btn cursor-pointer d-btn-square d-btn-primary d-btn-outline"
					inputType="reset"
					value="×"
					rawStyle
				/>
				<DaisyUiInputField
					className="d-btn cursor-pointer d-btn-primary d-btn-outline {viewBy === 'day' ? 'd-btn-active' : ''}"
					inputType="radio"
					nameText="view-by"
					ariaLabel="Day"
					checked={viewBy === 'day'}
					rawStyle
					onClick={() => (viewBy = 'day')}
				/>
				<DaisyUiInputField
					className="d-btn cursor-pointer d-btn-primary d-btn-outline {viewBy === 'week' ? 'd-btn-active' : ''}"
					inputType="radio"
					nameText="view-by"
					ariaLabel="Week"
					checked={viewBy === 'week'}
					rawStyle
					onClick={() => (viewBy = 'week')}
				/>
				<DaisyUiInputField
					className="d-btn cursor-pointer d-btn-primary d-btn-outline {viewBy === 'month' ? 'd-btn-active' : ''}"
					inputType="radio"
					nameText="view-by"
					ariaLabel="Month"
					checked={viewBy === 'month'}
					rawStyle
					onClick={() => (viewBy = 'month')}
				/>
			</DaisyUiFilter>
		</div>

		<CallyDateCalendar
			bind:value={selectedDate}
			onChange={handleCalendarChange}
			showOutsideDays={true}
			className="w-full rounded-box border border-base-300 bg-base-100 shadow-lg"
		/>
	</DaisyUiCardBody>
</DaisyUiCard>
