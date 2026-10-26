<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import {
		SvelteDate,
		SvelteURLSearchParams
	} from 'svelte/reactivity';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashDialog from '$lib/component/wash/dialog/WashDialog.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import OtPageHeader from '$lib/component/own/local/private/medora/operation-theatre/OtPageHeader.svelte';
	import OtStatusBadge from '$lib/component/own/local/private/medora/operation-theatre/OtStatusBadge.svelte';
	import type {
		OtBookingStatus,
		OtOptions,
		OtRequestRow,
		OtSchedulerBooking,
		OtSchedulerResult
	} from '$lib/model/type/medora/operation-theatre.type';
	import {
		OT_STATUS_VIEWS,
		formatOtTime,
		localHhmm,
		schedulerRowForTime,
		schedulerRowSpan,
		schedulerTimeSlots
	} from '$lib/tool/operation-theatre/ot-status.util';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import { connectPerioperativeSse } from '$lib/util/perioperative-sse.util.svelte';
	import LucideChevronLeft from '$lib/component/own/library/lucide/LucideChevronLeft.svelte';
	import LucideChevronRight from '$lib/component/own/library/lucide/LucideChevronRight.svelte';
	import LucideCalendar from '$lib/component/own/library/lucide/LucideCalendar.svelte';

	const toast = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/operation-theatre`
			: ''
	);
	const today = new SvelteDate();
	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	let date = $state(page.url.searchParams.get('date') ?? todayStr);
	let branchId = $state('');
	let search = $state('');
	let loading = $state(false);
	let scheduler = $state<OtSchedulerResult>({
		date: todayStr,
		rooms: [],
		bookings: []
	});
	let options = $state<OtOptions | null>(null);
	let pending = $state<OtRequestRow[]>([]);
	let selectedBooking = $state<OtSchedulerBooking | null>(null);
	let dialogOpen = $state(false);
	let submitting = $state(false);

	let form = $state({
		caseId: '',
		otRoomId: '',
		scheduledStart: '',
		scheduledEnd: '',
		notes: ''
	});

	const slots = schedulerTimeSlots();
	const statuses: OtBookingStatus[] = OT_STATUS_VIEWS.map((s) => ({
		id: s.id,
		name: s.label,
		code: s.code
	}));

	const branchOptions = $derived([
		{ value: '', label: 'All facilities' },
		...(options?.branches ?? []).map((branch) => ({
			value: branch.id,
			label: branch.name
		}))
	]);
	const requestOptions = $derived([
		{ value: '', label: 'Select request' },
		...pending.map((request) => ({
			value: String(request.id),
			label: `${request.patientName} · ${request.procedureName || 'Procedure'} · ${request.hrn ?? '—'}`
		}))
	]);
	const roomOptions = $derived([
		{ value: '', label: 'Select theatre' },
		...(options?.rooms ?? []).map((room) => ({
			value: String(room.id),
			label: room.name
		}))
	]);

	function shiftDate(days: number) {
		const d = new SvelteDate(`${date}T12:00:00`);
		d.setDate(d.getDate() + days);
		date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		void load();
	}

	function addMinutes(value: string, minutes: number): string {
		const d = new SvelteDate(value);
		if (Number.isNaN(d.getTime())) return value;
		d.setMinutes(d.getMinutes() + minutes);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	async function loadOptions() {
		if (!apiBase) return;
		const res = await fetch(
			`${apiBase}/options?branchId=${encodeURIComponent(branchId)}`
		);
		if (!res.ok) await throwUserFacingHttpError(res);
		options = (await res.json()) as OtOptions;
	}

	async function loadScheduler() {
		if (!apiBase) return;
		loading = true;
		try {
			const q = new SvelteURLSearchParams({ date });
			if (branchId) q.set('branchId', branchId);
			if (search.trim()) q.set('search', search.trim());
			const res = await fetch(`${apiBase}/scheduler?${q.toString()}`);
			if (!res.ok) await throwUserFacingHttpError(res);
			scheduler = (await res.json()) as OtSchedulerResult;
		} catch (err) {
			toast.addErrorToast('Could not load the OT schedule', err);
		} finally {
			loading = false;
		}
	}

	async function loadPending() {
		if (!apiBase) return;
		const q = new SvelteURLSearchParams({
			scope: 'pending',
			pageSize: '100'
		});
		if (branchId) q.set('branchId', branchId);
		const res = await fetch(`${apiBase}/requests?${q.toString()}`);
		if (!res.ok) await throwUserFacingHttpError(res);
		const result = (await res.json()) as { data: OtRequestRow[] };
		pending = result.data;
	}

	async function loadAll() {
		await Promise.all([
			loadOptions(),
			loadScheduler(),
			loadPending()
		]);
	}

	function openBook(slot?: string, roomId?: number) {
		const start = slot ? `${date}T${slot}:00` : `${date}T08:00:00`;
		const room = roomId
			? String(roomId)
			: (options?.rooms[0]?.id?.toString() ?? '');
		form = {
			caseId: '',
			otRoomId: room,
			scheduledStart: start,
			scheduledEnd: addMinutes(start, 60),
			notes: ''
		};
		dialogOpen = true;
	}

	function openExisting(booking: OtSchedulerBooking) {
		selectedBooking = booking;
	}

	async function book() {
		if (!apiBase) return;
		if (!form.caseId || !form.otRoomId) {
			toast.addWarningToast('Select an OT request and a theatre.');
			return;
		}
		submitting = true;
		try {
			const res = await fetch(`${apiBase}/bookings`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'book',
					caseId: Number(form.caseId),
					otRoomId: Number(form.otRoomId),
					scheduledStart: form.scheduledStart,
					scheduledEnd: form.scheduledEnd,
					notes: form.notes
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			dialogOpen = false;
			toast.addSuccessToast('OT booking created.');
			await loadAll();
		} catch (err) {
			toast.addErrorToast('Could not create the OT booking', err);
		} finally {
			submitting = false;
		}
	}

	function roomIndex(roomId: number) {
		return scheduler.rooms.findIndex((r) => r.id === roomId);
	}

	onMount(() => {
		void loadAll();
		if (!hospitalId) return;
		return connectPerioperativeSse({
			hospitalId,
			onEvent: () => void loadAll()
		});
	});
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
	<OtPageHeader
		title="OT Scheduler"
		description="Theatre-wise day schedule with 30-minute slots from 08:00 to 23:30."
		{loading}
		onRefresh={loadAll}
		addLabel="Book OT"
		onAdd={() => openBook()}
	/>

	<section
		class="rounded-box flex flex-wrap items-end gap-2 border border-base-300 p-3"
	>
		<label class="form-control">
			<span class="label-text text-xs">Date</span>
			<span class="flex items-center gap-1">
				<WashButton
					variant="ghost"
					size="sm"
					className="cursor-pointer"
					onClick={() => shiftDate(-1)}
					title="Previous day"
				>
					<LucideChevronLeft className="size-4" />
				</WashButton>
				<WashInputField
					inputType="date"
					className="input-sm"
					bind:value={date}
					oninput={() => void loadScheduler()}
				/>
				<WashButton
					variant="ghost"
					size="sm"
					className="cursor-pointer"
					onClick={() => shiftDate(1)}
					title="Next day"
				>
					<LucideChevronRight className="size-4" />
				</WashButton>
			</span>
		</label>
		<label class="form-control min-w-[12rem]">
			<span class="label-text text-xs">Facility</span>
			<WashSelect
				className="select-sm"
				bind:value={branchId}
				options={branchOptions}
				onChange={() => void loadAll()}
			/>
		</label>
		<label class="form-control min-w-[14rem] flex-1">
			<span class="label-text text-xs"
				>Search patient / surgeon / specialty</span
			>
			<input
				class="input input-sm w-full"
				bind:value={search}
				placeholder="HRN, name, surgeon, specialty"
				onkeydown={(e) => e.key === 'Enter' && loadScheduler()}
			/>
		</label>
		<WashButton
			variant="secondary"
			size="sm"
			className="cursor-pointer"
			onClick={loadScheduler}
		>
			Apply
		</WashButton>
		<WashButton
			variant="ghost"
			size="sm"
			className="cursor-pointer"
			onClick={() => {
				date = todayStr;
				branchId = '';
				search = '';
				void loadAll();
			}}
		>
			<LucideCalendar className="size-4" /> Today
		</WashButton>
		<p class="text-xs opacity-60">
			{scheduler.rooms.length} theatre{scheduler.rooms.length === 1
				? ''
				: 's'} · {scheduler.bookings.length} booking{scheduler
				.bookings.length === 1
				? ''
				: 's'}
		</p>
	</section>

	<div class="flex flex-wrap items-center gap-2">
		{#each statuses as s (s.id)}
			<span
				class="badge badge-sm {OT_STATUS_VIEWS.find(
					(v) => v.id === s.id
				)?.badgeClass ?? ''}"
			>
				{s.name}
			</span>
		{/each}
	</div>

	{#if scheduler.rooms.length === 0}
		<div
			class="rounded-box flex flex-1 items-center justify-center border border-base-300 p-8 text-center"
		>
			<div>
				<p class="font-semibold">No theatres configured</p>
				<p class="text-sm opacity-70">
					Add theatres in OT Master for the selected facility.
				</p>
			</div>
		</div>
	{:else}
		<section
			class="rounded-box min-h-0 flex-1 overflow-auto border border-base-300"
		>
			<div class="min-w-[920px]">
				<div
					class="sticky top-0 z-20 grid border-b border-base-300 bg-base-200"
					style={`grid-template-columns: 72px repeat(${scheduler.rooms.length}, minmax(190px, 1fr));`}
				>
					<div class="px-2 py-2 text-xs font-semibold">Time</div>
					{#each scheduler.rooms as room (room.id)}
						<div class="border-l border-base-300 px-2 py-2">
							<p class="text-sm font-semibold">{room.name}</p>
							<p class="text-[11px] opacity-60">
								{room.freezeMinutes > 0
									? `${room.freezeMinutes} min freeze`
									: 'No freeze'}
								{room.otAdvanceMandatory ? ' · advance required' : ''}
							</p>
						</div>
					{/each}
				</div>
				<div
					class="grid"
					style={`grid-template-columns: 72px repeat(${scheduler.rooms.length}, minmax(190px, 1fr)); grid-template-rows: repeat(${slots.length}, 40px);`}
				>
					{#each slots as slot, i (slot)}
						<div
							class="border-b border-base-300 bg-base-100 px-2 py-1 text-[11px] opacity-70"
							style={`grid-column: 1; grid-row: ${i + 1};`}
						>
							{slot}
						</div>
						{#each scheduler.rooms as room, ri (room.id)}
							<button
								type="button"
								class="cursor-pointer border-b border-l border-base-300 hover:bg-primary/10"
								style={`grid-column: ${ri + 2}; grid-row: ${i + 1};`}
								title={`Book ${room.name} at ${slot}`}
								onclick={() => openBook(slot, room.id)}
							></button>
						{/each}
					{/each}
					{#each scheduler.bookings as booking (booking.id)}
						{@const ri = roomIndex(booking.otRoomId)}
						{#if ri >= 0}
							<button
								type="button"
								class="z-10 m-0.5 cursor-pointer overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] shadow-sm {OT_STATUS_VIEWS.find(
									(v) => v.id === booking.statusTaggingId
								)?.blockClass ?? 'bg-base-200'}"
								style={`grid-column: ${ri + 2}; grid-row: ${schedulerRowForTime(localHhmm(booking.scheduledStart))} / span ${schedulerRowSpan(localHhmm(booking.scheduledStart), localHhmm(booking.scheduledEnd))};`}
								onclick={() => openExisting(booking)}
							>
								<span class="block truncate font-bold">
									{formatOtTime(booking.scheduledStart)}
									{booking.patientName}
								</span>
								<span class="block truncate"
									>{booking.procedureName || 'Procedure'}</span
								>
								<span class="block truncate opacity-80"
									>{booking.surgeonName ?? '—'}</span
								>
								{#if booking.bookingNo}
									<span class="block truncate opacity-70"
										>{booking.bookingNo}</span
									>
								{/if}
							</button>
						{/if}
					{/each}
				</div>
			</div>
		</section>
	{/if}
</div>

{#if selectedBooking}
	<WashDialog
		open={selectedBooking != null}
		onClose={() => (selectedBooking = null)}
		title={selectedBooking.bookingNo ?? 'OT booking'}
		description={`${selectedBooking.patientName} · ${selectedBooking.procedureName}`}
	>
		<div class="grid gap-2 text-sm sm:grid-cols-2">
			<p>
				<span class="opacity-60">Theatre:</span>
				{selectedBooking.otRoomName ?? '—'}
			</p>
			<p>
				<span class="opacity-60">Time:</span>
				{formatOtTime(selectedBooking.scheduledStart)} – {formatOtTime(
					selectedBooking.scheduledEnd
				)}
			</p>
			<p>
				<span class="opacity-60">HRN:</span>
				{selectedBooking.hrn ?? '—'}
			</p>
			<p>
				<span class="opacity-60">Visit:</span>
				{selectedBooking.visitNo ?? '—'}
			</p>
			<p>
				<span class="opacity-60">Surgeon:</span>
				{selectedBooking.surgeonName ?? '—'}
			</p>
			<p>
				<span class="opacity-60">Specialty:</span>
				{selectedBooking.specialtyName ?? '—'}
			</p>
			<p class="sm:col-span-2">
				<span class="opacity-60">Status:</span>
				<OtStatusBadge statusId={selectedBooking.statusTaggingId} />
			</p>
		</div>
		{#snippet actions()}
			<WashButton
				variant="ghost"
				size="sm"
				className="cursor-pointer"
				onClick={() => (selectedBooking = null)}>Close</WashButton
			>
			<a
				class="btn btn-primary btn-sm"
				href={resolve(
					`/medora/hospital/${hospitalId}/home/operation-theatre/booking-details?caseId=${selectedBooking.id}` as never
				)}
			>
				Open details
			</a>
		{/snippet}
	</WashDialog>
{/if}

<WashDialog
	open={dialogOpen}
	onClose={() => (dialogOpen = false)}
	title="Book OT request"
	description="Choose an unbooked OT request, theatre and time."
>
	<div class="grid gap-3 sm:grid-cols-2">
		<label class="form-control min-w-0 sm:col-span-2">
			<span class="label-text text-xs">OT request</span>
			<WashSelect
				className="select-sm"
				bind:value={form.caseId}
				options={requestOptions}
			/>
		</label>
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Theatre</span>
			<WashSelect
				className="select-sm"
				bind:value={form.otRoomId}
				options={roomOptions}
			/>
		</label>
		<label class="form-control">
			<span class="label-text text-xs">Notes</span>
			<input
				class="input input-sm w-full"
				bind:value={form.notes}
				placeholder="Optional booking note"
			/>
		</label>
		<label class="form-control">
			<span class="label-text text-xs">Start</span>
			<WashInputField
				inputType="datetime-local"
				className="input-sm w-full"
				bind:value={form.scheduledStart}
			/>
		</label>
		<label class="form-control">
			<span class="label-text text-xs">End</span>
			<WashInputField
				inputType="datetime-local"
				className="input-sm w-full"
				bind:value={form.scheduledEnd}
			/>
		</label>
	</div>
	{#snippet actions()}
		<WashButton
			variant="ghost"
			size="sm"
			className="cursor-pointer"
			onClick={() => (dialogOpen = false)}>Cancel</WashButton
		>
		<WashButton
			variant="primary"
			size="sm"
			className="cursor-pointer"
			loading={submitting}
			disabled={submitting}
			onClick={book}>Book</WashButton
		>
	{/snippet}
</WashDialog>
