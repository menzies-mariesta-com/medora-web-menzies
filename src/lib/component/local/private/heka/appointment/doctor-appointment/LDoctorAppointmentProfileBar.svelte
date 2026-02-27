<script lang="ts">
	import CallyDateCalendar from '$lib/component/library/cally/CallyDateCalendar.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
import DaisyUiFilter from '$lib/component/library/daisyui/filter/DaisyUiFilter.svelte';
import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
import DaisyUiSearchSelect from '$lib/component/library/daisyui/search-select/DaisyUISearchSelect.svelte';
import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
import {
	type StaffWithRelations,
	getDoctorStaffPaginated,
	getStaffByIdWithRelations
} from '$lib/remote/table/information-table/staff.remote';
import { StringUtil } from '$lib/util/string.util.svelte';
import { page } from '$app/state';

	let {
		doctorList,
		selectedDoctorId = $bindable(''),
		selectedBranchId = $bindable(''),
		viewBy = $bindable('day'),
		timeFormat = $bindable('24h'),
		branchOptions = [],
		branchLocked = false,
		branchIdForSearch,
		onDateChange
	} = $props<{
		doctorList: StaffWithRelations[];
		selectedDoctorId?: string;
		selectedBranchId?: string;
		viewBy?: 'day' | 'week' | 'month';
		timeFormat?: '24h' | '12h';
		branchOptions?: { id: string; name: string | null }[];
		branchLocked?: boolean;
		branchIdForSearch?: string;
		onDateChange?: (date: string) => void;
	}>();

	let selectedDate = $state(new Date().toISOString().slice(0, 10));
	const hospitalId = $derived(
		(typeof page.params?.hospital_id === 'string' && page.params.hospital_id) || ''
	);

	async function searchDoctors(query: string): Promise<{ label: string; value: string }[]> {
		const res = await getDoctorStaffPaginated({
			search: query.trim(),
			hospitalId: hospitalId || undefined,
			branchId: branchIdForSearch || undefined,
			page: 1,
			pageSize: 20
		});
		return res.data.map((doctor) => ({
			label: StringUtil.doctorOptionDisplayName(doctor),
			value: String(doctor.id)
		}));
	}

	async function getDoctorLabelForValue(id: string): Promise<string> {
		const doctor = await getStaffByIdWithRelations({ id });
		if (!doctor) return '';
		return StringUtil.doctorOptionDisplayName(doctor);
	}

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

		<DaisyUiSearchSelect
			bind:value={selectedDoctorId}
			placeholder="Select a doctor ..."
			className="w-full"
			searchFn={searchDoctors}
			getLabelForValue={getDoctorLabelForValue}
			minSearchLength={0}
		/>
		{#if branchOptions.length > 0}
			<div class="flex items-center justify-between gap-3">
				<p class="font-bold">Branch</p>
				<DaisyUiSelect
					className="w-56"
					bind:value={selectedBranchId}
					disabled={branchLocked}
				>
					{#each branchOptions as b (b.id)}
						<option value={b.id}>{b.name ?? b.id}</option>
					{/each}
				</DaisyUiSelect>
			</div>
		{/if}
		<div class="flex items-center justify-between">
			<p class="font-bold">View By</p>
			<DaisyUiFilter className="gap-1">
				<DaisyUiInputField
					className="d-btn cursor-pointer d-btn-square d-btn-primary d-btn-outline"
					inputType="reset"
					value="X"
					rawStyle
				/>
				<DaisyUiInputField
					className="d-btn cursor-pointer d-btn-primary d-btn-outline {viewBy ===
					'day'
						? 'd-btn-active'
						: ''}"
					inputType="radio"
					nameText="view-by"
					ariaLabel="Day"
					checked={viewBy === 'day'}
					rawStyle
					onClick={() => (viewBy = 'day')}
				/>
				<DaisyUiInputField
					className="d-btn cursor-pointer d-btn-primary d-btn-outline {viewBy ===
					'week'
						? 'd-btn-active'
						: ''}"
					inputType="radio"
					nameText="view-by"
					ariaLabel="Week"
					checked={viewBy === 'week'}
					rawStyle
					onClick={() => (viewBy = 'week')}
				/>
				<DaisyUiInputField
					className="d-btn cursor-pointer d-btn-primary d-btn-outline {viewBy ===
					'month'
						? 'd-btn-active'
						: ''}"
					inputType="radio"
					nameText="view-by"
					ariaLabel="Month"
					checked={viewBy === 'month'}
					rawStyle
					onClick={() => (viewBy = 'month')}
				/>
			</DaisyUiFilter>
		</div>

		<div class="flex items-center justify-between">
			<p class="font-bold">Time Format</p>
			<DaisyUiFilter className="gap-1">
				<DaisyUiInputField
					className="d-btn cursor-pointer d-btn-square d-btn-primary d-btn-outline"
					inputType="reset"
					value="X"
					rawStyle
				/>
				<DaisyUiInputField
					className="d-btn cursor-pointer d-btn-primary d-btn-outline {timeFormat ===
					'12h'
						? 'd-btn-active'
						: ''}"
					inputType="radio"
					nameText="time-format"
					ariaLabel="12h"
					checked={timeFormat === '12h'}
					rawStyle
					onClick={() => (timeFormat = '12h')}
				/>

				<DaisyUiInputField
					className="d-btn cursor-pointer d-btn-primary d-btn-outline {timeFormat ===
					'24h'
						? 'd-btn-active'
						: ''}"
					inputType="radio"
					nameText="time-format"
					ariaLabel="24h"
					checked={timeFormat === '24h'}
					rawStyle
					onClick={() => (timeFormat = '24h')}
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
