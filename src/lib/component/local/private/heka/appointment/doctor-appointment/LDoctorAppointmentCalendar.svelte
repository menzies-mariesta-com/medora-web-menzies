<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiCardBodyTitle from '$lib/component/library/daisyui/card/body/title/DaisyUiCardBodyTitle.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiTableBody from '$lib/component/library/daisyui/table/body/DaisyUiTableBody.svelte';
	import DaisyUiTable from '$lib/component/library/daisyui/table/DaisyUiTable.svelte';
	import DaisyUiTableHeader from '$lib/component/library/daisyui/table/head/DaisyUiTableHeader.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';

	/** Slot shape: date (YYYY-MM-DD), startTime/endTime (HH:mm or HH:mm:ss). */
	type ScheduleSlot = {
		date: string;
		startTime: string;
		endTime: string;
	};

	let {
		selectDate,
		viewBy = 'day',
		selectedDoctorName = '',
		scheduleSlots = [] as ScheduleSlot[],
		scheduleStartDate,
		scheduleEndDate
	} = $props<{
		selectDate: string;
		viewBy?: 'day' | 'week' | 'month';
		selectedDoctorName?: string;
		/** Doctor schedule slots: cells inside any slot get normal bg, outside get bg-base-200. */
		scheduleSlots?: ScheduleSlot[];
		/** Legacy: date range outside which cells get bg-base-200. */
		scheduleStartDate?: string;
		scheduleEndDate?: string;
	}>();

	const dateTimeUtil = new DateTimeUtil();

	/** Local YYYY-MM-DD so column dates match schedule slot dates (no UTC shift). */
	function toLocalDateString(d: Date): string {
		const c = dateTimeUtil.getDateComponents(d);
		return `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;
	}

	const headerCells = $derived.by(() => {
		if (!selectDate) return [];
		const date = new Date(selectDate + 'T12:00:00');
		if (isNaN(date.getTime())) return [];

		if (viewBy === 'day') {
			return [
				{
					label: dateTimeUtil.formatDate(date, 'en-US', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					}),
					dateString: toLocalDateString(date)
				}
			];
		}

		if (viewBy === 'week') {
			const weekStart = dateTimeUtil.getWeekStartDate(date, 0);
			return Array.from({ length: 7 }, (_, i) => {
				const d = dateTimeUtil.addDays(weekStart, i);
				return {
					label: `${dateTimeUtil.getDayOfWeek(d, 'en-US').slice(0, 3)} ${d.getDate()}/${d.getMonth() + 1}`,
					dateString: toLocalDateString(d)
				};
			});
		}

		// month: same style as week — one column per day of the month
		const startOfMonth = dateTimeUtil.startOfMonth(date);
		const year = startOfMonth.getFullYear();
		const monthIndex = startOfMonth.getMonth();
		const daysInMonth = dateTimeUtil.getDaysInMonth(year, monthIndex);
		return Array.from({ length: daysInMonth }, (_, i) => {
			const d = dateTimeUtil.addDays(startOfMonth, i);
			return {
				label: `${dateTimeUtil.getDayOfWeek(d, 'en-US').slice(0, 3)} ${d.getDate()}/${d.getMonth() + 1}`,
				dateString: toLocalDateString(d)
			};
		});
	});

	const titleLabel = $derived.by(() => {
		if (!selectDate) return selectDate;
		const date = new Date(selectDate);
		if (isNaN(date.getTime())) return selectDate;
		if (viewBy === 'day') {
			return dateTimeUtil.formatDate(date, 'en-US', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		}
		if (viewBy === 'week') {
			const weekStart = dateTimeUtil.getWeekStartDate(date, 0);
			const weekEnd = dateTimeUtil.addDays(weekStart, 6);
			return `${dateTimeUtil.formatDate(weekStart, 'en-US', { month: 'short', day: 'numeric' })} – ${dateTimeUtil.formatDate(weekEnd, 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
		}
		return dateTimeUtil.formatDate(date, 'en-US', {
			month: 'long',
			year: 'numeric'
		});
	});

	// 10-minute blocks from 00:00 to 23:50 (144 slots)
	const timeSlots = $derived(
		Array.from({ length: 24 * 6 }, (_, i) => {
			const hours = Math.floor(i / 6);
			const minutes = (i % 6) * 10;
			return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
		})
	);

	/** Normalize time to HH:mm for comparison (pad so "6:00" and "06:00" match). */
	function toHHmm(t: string): string {
		if (!t) return '';
		const parts = String(t).trim().split(':');
		const h = parts[0]
			? String(Number(parts[0])).padStart(2, '0')
			: '00';
		const m = parts[1]
			? String(Number(parts[1])).padStart(2, '0')
			: '00';
		return `${h}:${m}`;
	}

	/** True if (date, timeSlot) is inside any schedule slot → use normal/schedule bg. */
	function isCellInSchedule(
		dateString: string,
		timeSlot: string
	): boolean {
		const t = toHHmm(timeSlot);
		return scheduleSlots.some(
			(s: ScheduleSlot) =>
				s.date === dateString &&
				toHHmm(s.startTime) <= t &&
				t <= toHHmm(s.endTime)
		);
	}

	/** True if this column date is outside the doctor schedule range (irrelevant → grey). */
	function isDateIrrelevant(dateString: string): boolean {
		if (!scheduleStartDate || !scheduleEndDate) return false;
		return (
			dateString < scheduleStartDate || dateString > scheduleEndDate
		);
	}

	/** Cell bg: in-schedule = primary, outside schedule or irrelevant = grey. */
	function getCellBg(dateString: string, timeSlot: string): string {
		if (isDateIrrelevant(dateString)) return 'bg-base-200';
		if (scheduleSlots.length > 0) {
			return isCellInSchedule(dateString, timeSlot)
				? 'bg-primary/30'
				: 'bg-base-200';
		}
		return 'bg-base-100';
	}
</script>

<DaisyUiCard>
	<DaisyUiCardBody className="gap-4">
		<DaisyUiCardBodyTitle
			className="flex flex-wrap items-center gap-2 justify-between"
		>
			<div>
				<span>{titleLabel}</span>
				{#if selectedDoctorName}
					<span class="font-semibold opacity-90"
						>– {selectedDoctorName}</span
					>
				{/if}
			</div>
			<div>
				<DaisyUiTooltip
					tooltipText="create appointment"
					className="d-tooltip-left d-tooltip-primary"
				>
					<DaisyUiButton className="d-btn-primary d-btn-square">
						<LucidePlus />
					</DaisyUiButton>
				</DaisyUiTooltip>

				<DaisyUiTooltip
					tooltipText="edit appointment"
					className="d-tooltip-left d-tooltip-accent"
				>
					<DaisyUiButton className="d-btn-accent d-btn-square">
						<LucidePencil />
					</DaisyUiButton>
				</DaisyUiTooltip>

				<DaisyUiTooltip
					tooltipText="delete appointment"
					className="d-tooltip-left d-tooltip-error"
				>
					<DaisyUiButton className="d-btn-error d-btn-square">
						<LucideTrash2 />
					</DaisyUiButton>
				</DaisyUiTooltip>
			</div>
		</DaisyUiCardBodyTitle>

		<div class="max-h-[70vh] w-full min-w-0 overflow-auto">
			<DaisyUiTable className="w-max min-w-full">
				<DaisyUiTableHeader>
					<tr>
						<th
							class="sticky top-0 left-0 z-20 w-14 min-w-14 bg-base-200 whitespace-nowrap"
							>Time</th
						>
						{#each headerCells as cell}
							<th
								class="sticky top-0 z-20 min-w-28 bg-base-200 whitespace-nowrap"
								>{cell.label}</th
							>
						{/each}
					</tr>
				</DaisyUiTableHeader>
				<DaisyUiTableBody>
					{#each timeSlots as timeSlot}
						<tr>
							<td
								class="sticky left-0 z-10 w-14 min-w-14 bg-base-100 font-mono text-sm whitespace-nowrap"
								>{timeSlot}</td
							>
							{#each headerCells as cell}
								<td
									class="min-w-28 {getCellBg(
										cell.dateString,
										timeSlot
									)}"
								></td>
							{/each}
						</tr>
					{/each}
				</DaisyUiTableBody>
			</DaisyUiTable>
			<!-- legend -->
		</div>
		<div class="flex justify-center gap-7">
			<div class="flex items-center gap-2">
				<span class="h-5 w-5 rounded-md bg-primary/30"></span>
				on schedule
			</div>
			<div class="flex items-center gap-2">
				<span class="h-5 w-5 rounded-md bg-base-200"></span>
				off schedule
			</div>
		</div>
	</DaisyUiCardBody>
</DaisyUiCard>
