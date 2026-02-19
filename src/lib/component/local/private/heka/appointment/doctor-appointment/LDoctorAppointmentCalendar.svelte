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
	import LCreateAppointmentDialogContent from '$lib/component/local/private/heka/appointment/doctor-appointment/LCreateAppointmentDialogContent.svelte';
	import LEditAppointmentDialogContent from '$lib/component/local/private/heka/appointment/doctor-appointment/LEditAppointmentDialogContent.svelte';
	import { CreateAppointmentDialogState } from '$lib/state/create-appointment-dialog.state.svelte';
	import { EditAppointmentDialogState } from '$lib/state/edit-appointment-dialog.state.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { deleteAppointment } from '$lib/remote/table/information-table/appointment.remote';
	import { DateTimeUtil } from '$lib/util/date-time.util.svelte';

	/** Slot shape: date (YYYY-MM-DD), startTime/endTime (HH:mm or HH:mm:ss). */
	type ScheduleSlot = {
		date: string;
		startTime: string;
		endTime: string;
	};
	/** Appointment slot may include patient name and id for display and edit. */
	type AppointmentSlot = ScheduleSlot & { patientName?: string; appointmentId?: number };

	let {
		selectDate,
		viewBy = 'day',
		timeFormat = '24h',
		selectedDoctorName = '',
		selectedDoctorId = '',
		scheduleSlots = [] as ScheduleSlot[],
		appointmentSlots = [] as AppointmentSlot[],
		scheduleStartDate,
		scheduleEndDate,
		/** Interval in minutes for time column (e.g. 15 → 00:00, 00:15, 00:30 …). Default 15 so full 24h column always shows. */
		slotDurationMinutes = 15,
		onAppointmentCreated
	} = $props<{
		selectDate: string;
		viewBy?: 'day' | 'week' | 'month';
		/** Display time column as 24h (e.g. 14:00) or 12h (e.g. 2:00 PM). */
		timeFormat?: '24h' | '12h';
		selectedDoctorName?: string;
		/** Selected doctor (staff) id; passed into create-appointment dialog. */
		selectedDoctorId?: string;
		/** Doctor schedule slots: cells inside any slot get normal bg, outside get bg-base-200. */
		scheduleSlots?: ScheduleSlot[];
		/** Existing appointments: cells inside any slot get bg-primary; optional patientName shown in cell. */
		appointmentSlots?: AppointmentSlot[];
		/** Legacy: date range outside which cells get bg-base-200. */
		scheduleStartDate?: string;
		scheduleEndDate?: string;
		/** Minutes per time-slot row (doctor schedule slot timing). Default 15. */
		slotDurationMinutes?: number;
		/** Called after an appointment is created so the page can refetch and show it. */
		onAppointmentCreated?: () => void | Promise<void>;
	}>();

	let selectedAppointmentId = $state<number | null>(null);

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

	// Time column: always full 24h (00:00 … 23:xx), one row per slot interval. Independent of schedule; slot duration from props or default 15.
	const timeSlots = $derived.by(() => {
		const interval = Math.max(
			1,
			Math.min(60, slotDurationMinutes ?? 15)
		);
		const totalMinutes = 24 * 60;
		const count = Math.floor(totalMinutes / interval);
		return Array.from({ length: count }, (_, i) => {
			const mins = i * interval;
			const hours = Math.floor(mins / 60);
			const min = mins % 60;
			return `${String(hours).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
		});
	});

	/** Format HH:mm for display: 24h → "01:00", 12h → "1:00 AM". */
	function formatTimeForDisplay(hhmm: string): string {
		const [hStr, mStr] = hhmm.split(':');
		const hours = parseInt(hStr ?? '0', 10);
		const minutes = parseInt(mStr ?? '0', 10);
		if (timeFormat === '12h') {
			const d = dateTimeUtil.fromDateComponents({
				year: 2000,
				month: 1,
				day: 1,
				hours,
				minutes
			});
			return dateTimeUtil.formatTime(d, 'en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		}
		return hhmm;
	}

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

	/** True if (date, timeSlot) is inside any schedule slot → use schedule bg. */
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

	/** True if (date, timeSlot) is inside any appointment slot → use bg-primary. */
	function isCellInAppointment(
		dateString: string,
		timeSlot: string
	): boolean {
		const t = toHHmm(timeSlot);
		return appointmentSlots.some(
			(s: AppointmentSlot) =>
				s.date === dateString &&
				toHHmm(s.startTime) <= t &&
				t < toHHmm(s.endTime)
		);
	}

	/** Patient name for a cell that is inside an appointment (first matching slot). */
	function getCellAppointmentLabel(
		dateString: string,
		timeSlot: string
	): string {
		const t = toHHmm(timeSlot);
		const slot = appointmentSlots.find(
			(s: AppointmentSlot) =>
				s.date === dateString &&
				toHHmm(s.startTime) <= t &&
				t < toHHmm(s.endTime)
		);
		return (slot as AppointmentSlot | undefined)?.patientName?.trim() ?? '';
	}

	/** Appointment id for a cell that is inside an appointment (first matching slot). */
	function getCellAppointmentId(
		dateString: string,
		timeSlot: string
	): number | null {
		const t = toHHmm(timeSlot);
		const slot = appointmentSlots.find(
			(s: AppointmentSlot) =>
				s.date === dateString &&
				toHHmm(s.startTime) <= t &&
				t < toHHmm(s.endTime)
		);
		const id = (slot as AppointmentSlot | undefined)?.appointmentId;
		return id != null ? id : null;
	}

	/** True if (dateString, timeSlot) is in the past (slot start before now). */
	function isCellInPast(dateString: string, timeSlot: string): boolean {
		const slotStart = new Date(dateString + 'T' + timeSlot);
		return isNaN(slotStart.getTime()) || slotStart.getTime() < Date.now();
	}

	/** True if this column date is outside the doctor schedule range (irrelevant → grey). */
	function isDateIrrelevant(dateString: string): boolean {
		if (!scheduleStartDate || !scheduleEndDate) return false;
		return (
			dateString < scheduleStartDate || dateString > scheduleEndDate
		);
	}

	/** Cell bg: appointment = bg-primary, in-schedule = primary/30, outside or irrelevant = grey. */
	function getCellBg(dateString: string, timeSlot: string): string {
		if (isDateIrrelevant(dateString)) return 'bg-base-200';
		if (appointmentSlots.length > 0 && isCellInAppointment(dateString, timeSlot)) {
			return 'bg-primary';
		}
		if (scheduleSlots.length > 0) {
			return isCellInSchedule(dateString, timeSlot)
				? 'bg-primary/30'
				: 'bg-base-200';
		}
		return 'bg-base-100';
	}

	const canInteractWithCalendar = $derived(!!selectedDoctorId?.trim());

	/** Creating is allowed only when doctor is selected, cell has no existing appointment, and slot is not in the past. */
	function canCreateInCell(dateString: string, timeSlot: string): boolean {
		return (
			canInteractWithCalendar &&
			!isCellInAppointment(dateString, timeSlot) &&
			!isCellInPast(dateString, timeSlot)
		);
	}

	async function openCreateAppointmentDialog(
		dateString: string,
		timeSlot: string
	) {
		if (!canCreateInCell(dateString, timeSlot)) return;
		CreateAppointmentDialogState.slot = { dateString, timeSlot };
		CreateAppointmentDialogState.staffId = selectedDoctorId?.trim() || null;
		CreateAppointmentDialogState.slotDurationMinutes = slotDurationMinutes ?? 15;
		const result = await dialogService.open({
			title: 'Create appointment',
			component: LCreateAppointmentDialogContent,
			onClose: () => {
				CreateAppointmentDialogState.slot = null;
				CreateAppointmentDialogState.staffId = null;
			}
		});
		if (result?.confirmed) {
			await onAppointmentCreated?.();
		}
	}

	/** Open create dialog from Plus: no pre-filled slot; user must pick date and start time. */
	async function openCreateFromPlus() {
		if (!canInteractWithCalendar) return;
		CreateAppointmentDialogState.slot = null;
		CreateAppointmentDialogState.staffId = selectedDoctorId?.trim() || null;
		CreateAppointmentDialogState.slotDurationMinutes = slotDurationMinutes ?? 15;
		const result = await dialogService.open({
			title: 'Create appointment',
			component: LCreateAppointmentDialogContent,
			onClose: () => {
				CreateAppointmentDialogState.slot = null;
				CreateAppointmentDialogState.staffId = null;
			}
		});
		if (result?.confirmed) {
			await onAppointmentCreated?.();
		}
	}

	async function openEditAppointmentDialog(aptId: number) {
		EditAppointmentDialogState.appointmentId = aptId;
		EditAppointmentDialogState.slotDurationMinutes = slotDurationMinutes ?? 15;
		const result = await dialogService.open({
			title: 'Edit appointment',
			component: LEditAppointmentDialogContent
		});
		EditAppointmentDialogState.appointmentId = null;
		if (result?.confirmed) {
			selectedAppointmentId = null;
			await onAppointmentCreated?.();
		}
	}

	function handleCellClick(dateString: string, timeSlot: string) {
		const aptId = getCellAppointmentId(dateString, timeSlot);
		if (aptId != null) {
			selectedAppointmentId = aptId;
			openEditAppointmentDialog(aptId);
			return;
		}
		if (canCreateInCell(dateString, timeSlot)) {
			openCreateAppointmentDialog(dateString, timeSlot);
		}
	}

	async function handleDeleteSelected() {
		if (selectedAppointmentId == null) return;
		if (!confirm('Delete this appointment?')) return;
		try {
			await deleteAppointment({ id: selectedAppointmentId });
			selectedAppointmentId = null;
			await onAppointmentCreated?.();
		} catch {
			// toast or ignore
		}
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
					tooltipText="create appointment (pick date & time)"
					className="d-tooltip-left d-tooltip-primary"
				>
					<DaisyUiButton
						className="d-btn-primary d-btn-square"
						onClick={() => openCreateFromPlus()}
						disabled={!canInteractWithCalendar}
					>
						<LucidePlus />
					</DaisyUiButton>
				</DaisyUiTooltip>

				<DaisyUiTooltip
					tooltipText="edit selected appointment (click a slot first)"
					className="d-tooltip-left d-tooltip-accent"
				>
					<DaisyUiButton
						className="d-btn-accent d-btn-square"
						onClick={() => {
							if (selectedAppointmentId != null) void openEditAppointmentDialog(selectedAppointmentId);
						}}
						disabled={selectedAppointmentId == null}
					>
						<LucidePencil />
					</DaisyUiButton>
				</DaisyUiTooltip>

				<DaisyUiTooltip
					tooltipText="delete selected appointment"
					className="d-tooltip-left d-tooltip-error"
				>
					<DaisyUiButton
						className="d-btn-error d-btn-square"
						onClick={() => handleDeleteSelected()}
						disabled={selectedAppointmentId == null}
					>
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
								>{formatTimeForDisplay(timeSlot)}</td
							>
							{#each headerCells as cell}
								{@const canCreate = canCreateInCell(cell.dateString, timeSlot)}
								{@const cellLabel = getCellAppointmentLabel(cell.dateString, timeSlot)}
								{@const cellAptId = getCellAppointmentId(cell.dateString, timeSlot)}
								{@const isSelected = cellAptId != null && cellAptId === selectedAppointmentId}
								<td
									role={canCreate || cellAptId != null ? 'button' : undefined}
									tabindex={canCreate || cellAptId != null ? 0 : undefined}
									class="min-w-28 transition-[filter] duration-150 {canCreate
										? 'cursor-pointer hover:brightness-90'
										: cellAptId != null
											? 'cursor-pointer hover:brightness-90'
											: 'cursor-not-allowed opacity-90'} {isSelected
										? 'ring-2 ring-accent ring-offset-2 ring-offset-base-100'
										: ''} {getCellBg(
										cell.dateString,
										timeSlot
									)}"
									onclick={() => handleCellClick(cell.dateString, timeSlot)}
									onkeydown={(e) =>
										(canCreate || cellAptId != null) &&
										e.key === 'Enter' &&
										handleCellClick(cell.dateString, timeSlot)}
								>
									{#if cellLabel}
										<span class="line-clamp-2 text-xs font-medium text-primary-content"
											>{cellLabel}</span
										>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</DaisyUiTableBody>
			</DaisyUiTable>
			<!-- legend -->
		</div>
		<div class="flex flex-wrap justify-center gap-7">
			<div class="flex items-center gap-2">
				<span class="h-5 w-5 rounded-md bg-primary"></span>
				appointment
			</div>
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
