<script lang="ts">
	import CallyDateCalendar from '$lib/component/own/library/cally/CallyDateCalendar.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashFilter from '$lib/component/wash/filter/WashFilter.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import SearchSelect from '$lib/component/own/library/menzies/search-select/SearchSelect.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashTooltip from '$lib/component/wash/tooltip/WashTooltip.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { page } from '$app/state';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import type {
		DoctorListStaffRow,
		StaffWithRelations
	} from '$lib/model/type/medora/staff.type';

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
			? `/api/medora/hospital/${hospitalId}/home/appointment/doctor-appointment`
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

<WashCard className="!overflow-visible">
	<WashCardBody className="w-full gap-5 !overflow-visible">
		<WashCardBodyTitle
			className="flex items-center justify-between gap-2"
		>
			<span>Doctor :</span>
			{#if selectedDoctorId || selectedBranchId}
				<WashTooltip
					tooltipText="Reset Doctor"
					className=""
				>
					<WashButton
						className="btn-ghost btn-xs btn-circle"
						onClick={() => {
							selectedDoctorId = '';
							selectedBranchId = '';
						}}
					>
						<LucideX className="size-4" />
					</WashButton>
				</WashTooltip>
			{/if}
		</WashCardBodyTitle>

		<SearchSelect
			bind:value={selectedDoctorId}
			placeholder="Select a doctor ..."
			searchFn={searchDoctors}
			getLabelForValue={getDoctorLabelForValue}
			minSearchLength={0}
			emptyMessage="No doctors match."
		/>
		{#if branchOptions.length > 0}
			<div class="flex items-center justify-between gap-3">
				<p class="font-bold">Branch</p>
				<WashSelect
					className="w-56"
					bind:value={selectedBranchId}
					disabled={branchLocked}
				>
					{#each branchOptions as b (b.id)}
						<option value={b.id}>{b.name ?? b.id}</option>
					{/each}
				</WashSelect>
			</div>
		{/if}
		<div class="flex items-center justify-between">
			<p class="font-bold">View By</p>
			<WashFilter className="gap-1">
				<WashInputField
					className="btn cursor-pointer btn-square btn-primary btn-outline"
					inputType="reset"
					value="X"
					rawStyle
				/>
				<WashInputField
					className="btn cursor-pointer btn-primary btn-outline {viewBy ===
					'day'
						? 'btn-active'
						: ''}"
					inputType="radio"
					nameText="view-by"
					ariaLabel="Day"
					checked={viewBy === 'day'}
					rawStyle
					onClick={() => (viewBy = 'day')}
				/>
				<WashInputField
					className="btn cursor-pointer btn-primary btn-outline {viewBy ===
					'week'
						? 'btn-active'
						: ''}"
					inputType="radio"
					nameText="view-by"
					ariaLabel="Week"
					checked={viewBy === 'week'}
					rawStyle
					onClick={() => (viewBy = 'week')}
				/>
				<WashInputField
					className="btn cursor-pointer btn-primary btn-outline {viewBy ===
					'month'
						? 'btn-active'
						: ''}"
					inputType="radio"
					nameText="view-by"
					ariaLabel="Month"
					checked={viewBy === 'month'}
					rawStyle
					onClick={() => (viewBy = 'month')}
				/>
			</WashFilter>
		</div>

		<div class="flex items-center justify-between">
			<p class="font-bold">Time Format</p>
			<WashFilter className="gap-1">
				<WashInputField
					className="btn cursor-pointer btn-square btn-primary btn-outline"
					inputType="reset"
					value="X"
					rawStyle
				/>
				<WashInputField
					className="btn cursor-pointer btn-primary btn-outline {timeFormat ===
					'12h'
						? 'btn-active'
						: ''}"
					inputType="radio"
					nameText="time-format"
					ariaLabel="12h"
					checked={timeFormat === '12h'}
					rawStyle
					onClick={() => (timeFormat = '12h')}
				/>

				<WashInputField
					className="btn cursor-pointer btn-primary btn-outline {timeFormat ===
					'24h'
						? 'btn-active'
						: ''}"
					inputType="radio"
					nameText="time-format"
					ariaLabel="24h"
					checked={timeFormat === '24h'}
					rawStyle
					onClick={() => (timeFormat = '24h')}
				/>
			</WashFilter>
		</div>

		<CallyDateCalendar
			bind:value={selectedDate}
			onChange={handleCalendarChange}
			showOutsideDays={true}
			className="w-full rounded-box border border-base-300 bg-base-100 shadow-lg"
		/>
	</WashCardBody>
</WashCard>
