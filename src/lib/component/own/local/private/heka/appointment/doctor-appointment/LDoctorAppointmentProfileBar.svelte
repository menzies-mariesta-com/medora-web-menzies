<script lang="ts">
	import CallyDateCalendar from '$lib/component/own/library/cally/CallyDateCalendar.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiFilter from '$lib/component/daisyui/filter/DaisyUiFilter.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiSearchSelect from '$lib/component/daisyui/search-select/DaisyUISearchSelect.svelte';
	import DaisyUiSelect from '$lib/component/daisyui/select/DaisyUiSelect.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { page } from '$app/state';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type {
		DoctorListStaffRow,
		StaffWithRelations
	} from '$lib/model/type/heka/staff.type';

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
		doctorList: DoctorListStaffRow[];
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
		(typeof page.params?.hospital_id === 'string' &&
			page.params.hospital_id) ||
			''
	);
	const apiBase = $derived(
		hospitalId
			? `/api/heka/hospital/${hospitalId}/home/appointment/doctor-appointment`
			: ''
	);

	async function apiGet<T>(
		mode: string,
		params?: Record<string, string | undefined>
	): Promise<T> {
		const sp = new URLSearchParams();
		sp.set('mode', mode);
		if (params) {
			for (const [k, v] of Object.entries(params)) {
				if (v != null && v !== '') sp.set(k, v);
			}
		}
		const res = await fetch(`${apiBase}?${sp.toString()}`, {
			method: 'GET'
		});
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	async function searchDoctors(
		query: string
	): Promise<{ label: string; value: string }[]> {
		const res = await apiGet<PaginatedResult<StaffWithRelations>>(
			'doctor.paginated',
			{
				search: query.trim() || undefined,
				branchId: branchIdForSearch || undefined,
				page: '1',
				pageSize: String(AppEnum.PAGE_SIZE_FOR_SEARCH_SELECT)
			}
		);
		return (res.data ?? []).map((doctor) => ({
			label: StringUtil.doctorOptionDisplayName(doctor),
			value: String(doctor.id)
		}));
	}

	async function getDoctorLabelForValue(id: string): Promise<string> {
		const doctor = await apiGet<StaffWithRelations | null>(
			'doctor.byId',
			{
				id
			}
		);
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
		<DaisyUiCardBodyTitle
			className="flex items-center justify-between gap-2"
		>
			<span>Doctor :</span>
			{#if selectedDoctorId || selectedBranchId}
				<DaisyUiTooltip
					tooltipText="Reset Doctor"
					className=""
				>
					<DaisyUiButton
						className="d-btn-ghost d-btn-xs d-btn-circle"
						onClick={() => {
							selectedDoctorId = '';
							selectedBranchId = '';
						}}
					>
						<LucideX className="size-4" />
					</DaisyUiButton>
				</DaisyUiTooltip>
			{/if}
		</DaisyUiCardBodyTitle>

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
