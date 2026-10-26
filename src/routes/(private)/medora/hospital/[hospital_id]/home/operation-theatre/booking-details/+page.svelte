<script lang="ts">
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
		OtBloodRequisitionRow,
		OtBookingRow,
		OtOptions
	} from '$lib/model/type/medora/operation-theatre.type';
	import type { PaginatedResult } from '$lib/model/type/pagination.type';
	import { OtBookingStatusTaggingEnum } from '$lib/model/enum/db-link';
	import {
		formatOtDate,
		formatOtTime
	} from '$lib/tool/operation-theatre/ot-status.util';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const toast = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/operation-theatre`
			: ''
	);
	const initialCaseId = Number(
		page.url.searchParams.get('caseId') ?? 0
	);

	let options = $state<OtOptions | null>(null);
	let rows = $state<OtBookingRow[]>([]);
	let selected = $state<OtBookingRow | null>(null);
	let blood = $state<OtBloodRequisitionRow[]>([]);
	let loading = $state(false);
	let actionLoading = $state(false);
	let listResult = $state<PaginatedResult<OtBookingRow> | null>(null);
	let pageNo = $state(1);
	let pageSize = $state(10);
	let total = $state(0);

	let dateFrom = $state('');
	let dateTo = $state('');
	let branchId = $state('');
	let roomId = $state('');
	let statusId = $state('');
	let searchOn = $state('all');
	let search = $state('');
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	let dialog = $state<
		'book' | 'details' | 'tag' | 'abort' | 'blood' | null
	>(null);

	let bookForm = $state({
		otRoomId: '',
		scheduledStart: '',
		scheduledEnd: '',
		notes: ''
	});
	let detailsForm = $state({
		provisionalDiagnosis: '',
		clinicalNotes: '',
		surgeonId: '',
		paediatricianId: '',
		providerId: '',
		durationMinutes: ''
	});
	let tagForm = $state({ notes: '' });
	let abortForm = $state({ reason: '' });
	let bloodForm = $state({
		bloodGroup: '',
		component: 'Packed red blood cells',
		units: '1',
		urgency: 'routine',
		notes: ''
	});

	const branchOptions = $derived([
		{ value: '', label: 'All' },
		...(options?.branches ?? []).map((branch) => ({
			value: branch.id,
			label: branch.name
		}))
	]);
	const roomFilterOptions = $derived([
		{ value: '', label: 'All' },
		...(options?.rooms ?? []).map((room) => ({
			value: String(room.id),
			label: room.name
		}))
	]);
	const roomOptions = $derived([
		{ value: '', label: 'Select theatre' },
		...(options?.rooms ?? []).map((room) => ({
			value: String(room.id),
			label: room.name
		}))
	]);
	const statusOptions = $derived([
		{ value: '', label: 'All' },
		...(options?.statuses ?? []).map((status) => ({
			value: String(status.id),
			label: status.name
		}))
	]);
	const searchOnOptions = [
		{ value: 'all', label: 'All fields' },
		{ value: 'hrn', label: 'HRN' },
		{ value: 'encounter', label: 'Encounter' },
		{ value: 'patient', label: 'Patient name' },
		{ value: 'booking', label: 'Booking no' }
	];
	const pageSizeOptions = [10, 25, 50, 100].map((size) => ({
		value: String(size),
		label: `${size} per page`
	}));
	const surgeonOptions = $derived([
		{ value: '', label: 'Select surgeon' },
		...(options?.surgeons ?? []).map((surgeon) => ({
			value: surgeon.id,
			label: surgeon.name
		}))
	]);
	const optionalStaffOptions = $derived([
		{ value: '', label: 'None' },
		...(options?.surgeons ?? []).map((surgeon) => ({
			value: surgeon.id,
			label: surgeon.name
		}))
	]);
	const bloodGroupOptions = [
		{ value: '', label: 'Unknown' },
		...['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(
			(group) => ({ value: group, label: group })
		)
	];
	const bloodComponentOptions = [
		'Packed red blood cells',
		'Fresh frozen plasma',
		'Platelets',
		'Cryoprecipitate',
		'Whole blood'
	].map((component) => ({ value: component, label: component }));
	const urgencyOptions = [
		{ value: 'routine', label: 'Routine' },
		{ value: 'urgent', label: 'Urgent' },
		{ value: 'emergency', label: 'Emergency' }
	];

	function toLocalInput(iso: string | null): string {
		if (!iso) return '';
		const d = new SvelteDate(iso);
		if (Number.isNaN(d.getTime())) return '';
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	function addMinutes(value: string, minutes: number): string {
		const d = new SvelteDate(value);
		if (Number.isNaN(d.getTime())) return value;
		d.setMinutes(d.getMinutes() + minutes);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	const can = $derived({
		book: selected?.statusTaggingId === 71,
		confirm:
			selected?.statusTaggingId ===
			OtBookingStatusTaggingEnum.UNCONFIRMED,
		otPac:
			selected?.statusTaggingId ===
				OtBookingStatusTaggingEnum.UNCONFIRMED ||
			selected?.statusTaggingId ===
				OtBookingStatusTaggingEnum.CONFIRMED,
		checkIn:
			selected?.statusTaggingId ===
				OtBookingStatusTaggingEnum.CONFIRMED ||
			selected?.statusTaggingId === OtBookingStatusTaggingEnum.OT_PAC,
		postOp:
			selected?.statusTaggingId ===
			OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP,
		abort:
			selected != null &&
			selected.statusTaggingId >= 90 &&
			selected.statusTaggingId <= 93,
		details: selected != null && selected.statusTaggingId !== 95,
		tag:
			selected != null &&
			selected.statusTaggingId >= 71 &&
			selected.statusTaggingId <= 94
	});

	async function loadOptions() {
		if (!apiBase) return;
		const res = await fetch(`${apiBase}/options`);
		if (!res.ok) await throwUserFacingHttpError(res);
		options = (await res.json()) as OtOptions;
	}

	async function loadList() {
		if (!apiBase) return;
		loading = true;
		try {
			const q = new SvelteURLSearchParams({
				page: String(pageNo),
				pageSize: String(pageSize)
			});
			if (dateFrom) q.set('dateFrom', dateFrom);
			if (dateTo) q.set('dateTo', dateTo);
			if (branchId) q.set('branchId', branchId);
			if (roomId) q.set('otRoomId', roomId);
			if (statusId) q.set('status', statusId);
			if (searchOn) q.set('searchOn', searchOn);
			if (search.trim()) q.set('search', search.trim());
			const res = await fetch(`${apiBase}/bookings?${q.toString()}`);
			if (!res.ok) await throwUserFacingHttpError(res);
			const result =
				(await res.json()) as PaginatedResult<OtBookingRow>;
			listResult = result;
			rows = result.data;
			total = result.total;
			if (!selected && rows[0]) await selectBooking(rows[0]);
			if (selected && rows.some((r) => r.id === selected?.id)) {
				selected =
					rows.find((r) => r.id === selected?.id) ?? selected;
			}
		} catch (err) {
			toast.addErrorToast('Could not load OT bookings', err);
		} finally {
			loading = false;
		}
	}

	async function selectBooking(row: OtBookingRow) {
		selected = row;
		syncDetailsForm(row);
		await loadBlood(row.id);
	}

	async function loadDetail(caseId: number) {
		if (!apiBase) return;
		const res = await fetch(
			`${apiBase}/bookings?mode=detail&caseId=${caseId}`
		);
		if (!res.ok) await throwUserFacingHttpError(res);
		const row = (await res.json()) as OtBookingRow | null;
		if (!row) {
			toast.addWarningToast('OT booking not found.');
			return;
		}
		selected = row;
		syncDetailsForm(row);
		await loadBlood(row.id);
	}

	async function loadBlood(caseId: number) {
		if (!apiBase) return;
		const res = await fetch(
			`${apiBase}/blood-requisition?caseId=${caseId}`
		);
		if (!res.ok) {
			blood = [];
			return;
		}
		blood = (await res.json()) as OtBloodRequisitionRow[];
	}

	async function reload(keepSelection = true) {
		if (keepSelection && selected) {
			await loadDetail(selected.id);
		}
		await loadList();
	}

	function syncDetailsForm(row: OtBookingRow) {
		detailsForm = {
			provisionalDiagnosis: row.provisionalDiagnosis ?? '',
			clinicalNotes: row.clinicalNotes ?? '',
			surgeonId: row.surgeonId ?? '',
			paediatricianId: row.paediatricianId ?? '',
			providerId: row.providerId ?? '',
			durationMinutes: row.durationMinutes?.toString() ?? ''
		};
	}

	function openBook() {
		if (!selected) return;
		const baseDate =
			selected.scheduledStart ??
			`${new Date().toISOString().slice(0, 10)}T09:00:00`;
		bookForm = {
			otRoomId: selected.otRoomId ? String(selected.otRoomId) : '',
			scheduledStart: toLocalInput(baseDate),
			scheduledEnd: toLocalInput(
				selected.scheduledEnd ??
					addMinutes(baseDate, selected.durationMinutes ?? 60)
			),
			notes: selected.clinicalNotes ?? ''
		};
		dialog = 'book';
	}

	function openDetails() {
		if (!selected) return;
		syncDetailsForm(selected);
		dialog = 'details';
	}

	async function post(path: string, body: Record<string, unknown>) {
		if (!apiBase) return null;
		actionLoading = true;
		try {
			const res = await fetch(`${apiBase}/${path}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			return await res.json();
		} catch (err) {
			toast.addErrorToast(
				'The OT action could not be completed',
				err
			);
			return null;
		} finally {
			actionLoading = false;
		}
	}

	async function changeStatus(next: number, reason?: string) {
		if (!selected) return;
		const result = await post('bookings', {
			action: 'status',
			caseId: selected.id,
			statusTaggingId: next,
			reason
		});
		if (result) {
			toast.addSuccessToast('OT booking status updated.');
			dialog = null;
			await reload();
		}
	}

	async function saveBook() {
		if (!selected) return;
		const result = await post('bookings', {
			action: 'book',
			caseId: selected.id,
			otRoomId: Number(bookForm.otRoomId),
			scheduledStart: bookForm.scheduledStart,
			scheduledEnd: bookForm.scheduledEnd,
			notes: bookForm.notes
		});
		if (result) {
			toast.addSuccessToast('Theatre booked.');
			dialog = null;
			await reload();
			await loadList();
		}
	}

	async function saveDetails() {
		if (!selected) return;
		const result = await post('bookings', {
			action: 'details',
			caseId: selected.id,
			provisionalDiagnosis: detailsForm.provisionalDiagnosis,
			clinicalNotes: detailsForm.clinicalNotes,
			surgeonId: detailsForm.surgeonId || null,
			paediatricianId: detailsForm.paediatricianId || null,
			providerId: detailsForm.providerId || null,
			durationMinutes: detailsForm.durationMinutes
				? Number(detailsForm.durationMinutes)
				: null
		});
		if (result) {
			toast.addSuccessToast('Clinical details saved.');
			dialog = null;
			await reload();
		}
	}

	async function saveTag() {
		if (!selected) return;
		const result = await post('bookings', {
			action: 'tag',
			caseId: selected.id,
			notes: tagForm.notes
		});
		if (result) {
			toast.addSuccessToast('Patient tagged for OT.');
			dialog = null;
			await reload();
		}
	}

	async function saveAbort() {
		if (!abortForm.reason.trim()) {
			toast.addWarningToast('Enter the abort reason.');
			return;
		}
		await changeStatus(
			OtBookingStatusTaggingEnum.ABORTED,
			abortForm.reason
		);
	}

	async function saveBlood() {
		if (!selected) return;
		const result = await post('blood-requisition', {
			caseId: selected.id,
			bloodGroup: bloodForm.bloodGroup,
			component: bloodForm.component,
			units: Number(bloodForm.units),
			urgency: bloodForm.urgency,
			notes: bloodForm.notes
		});
		if (result) {
			toast.addSuccessToast('Blood requisition saved.');
			dialog = null;
			await loadBlood(selected.id);
		}
	}

	function goPage(next: number) {
		pageNo = Math.max(1, Math.min(listResult?.totalPages ?? 1, next));
		void loadList();
	}

	function onSearchInput() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			pageNo = 1;
			void loadList();
		}, 350);
	}

	onMount(() => {
		void (async () => {
			await loadOptions();
			await loadList();
			if (initialCaseId > 0) await loadDetail(initialCaseId);
			else if (!selected && rows[0]) await selectBooking(rows[0]);
		})();
	});
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-4">
	<OtPageHeader
		title="Booking Details"
		description="Manage theatre bookings, clinical details, patient tagging and blood requisitions."
		{loading}
		onRefresh={() => reload()}
	/>

	<section
		class="rounded-box grid gap-2 border border-base-300 p-3 sm:grid-cols-2 lg:grid-cols-6"
	>
		<label class="form-control">
			<span class="label-text text-xs">From</span>
			<WashInputField
				inputType="date"
				className="input-sm"
				bind:value={dateFrom}
			/>
		</label>
		<label class="form-control">
			<span class="label-text text-xs">To</span>
			<WashInputField
				inputType="date"
				className="input-sm"
				bind:value={dateTo}
			/>
		</label>
		<label class="form-control min-w-[10rem]">
			<span class="label-text text-xs">Facility</span>
			<WashSelect
				className="select-sm"
				bind:value={branchId}
				options={branchOptions}
			/>
		</label>
		<label class="form-control min-w-[10rem]">
			<span class="label-text text-xs">Theatre</span>
			<WashSelect
				className="select-sm"
				bind:value={roomId}
				options={roomFilterOptions}
			/>
		</label>
		<label class="form-control min-w-[10rem]">
			<span class="label-text text-xs">Status</span>
			<WashSelect
				className="select-sm"
				bind:value={statusId}
				options={statusOptions}
			/>
		</label>
		<label class="form-control min-w-[10rem]">
			<span class="label-text text-xs">Search on</span>
			<WashSelect
				className="select-sm"
				bind:value={searchOn}
				options={searchOnOptions}
			/>
		</label>
		<label class="form-control sm:col-span-2 lg:col-span-4">
			<span class="label-text text-xs">Search</span>
			<input
				class="input input-sm w-full"
				bind:value={search}
				oninput={onSearchInput}
				placeholder="Type to search bookings"
			/>
		</label>
		<div class="flex items-end gap-2">
			<WashButton
				variant="secondary"
				size="sm"
				className="cursor-pointer"
				onClick={() => {
					pageNo = 1;
					void loadList();
				}}>Apply</WashButton
			>
			<WashButton
				variant="ghost"
				size="sm"
				className="cursor-pointer"
				onClick={() => {
					dateFrom = '';
					dateTo = '';
					branchId = '';
					roomId = '';
					statusId = '';
					search = '';
					pageNo = 1;
					void loadList();
				}}>Clear</WashButton
			>
		</div>
	</section>

	<div class="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1.35fr_1fr]">
		<section class="flex min-h-0 flex-col gap-2">
			<div
				class="rounded-box min-h-0 flex-1 overflow-auto border border-base-300"
			>
				<table class="table-sm table-zebra table">
					<thead class="sticky top-0 z-10 bg-base-200">
						<tr>
							<th>Booking</th>
							<th>Patient</th>
							<th>Theatre / time</th>
							<th>Procedure</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row (row.id)}
							<tr
								class="cursor-pointer {selected?.id === row.id
									? 'bg-primary/10'
									: ''}"
								onclick={() => selectBooking(row)}
							>
								<td>
									<p class="font-medium">
										{row.bookingNo ?? 'Unbooked'}
									</p>
									<p class="text-xs opacity-60">{row.hrn ?? '—'}</p>
								</td>
								<td>
									<p>{row.patientName}</p>
									<p class="text-xs opacity-60">
										{row.ageGender} · {row.wardName ?? 'OP'}{row.bedNo
											? ` / ${row.bedNo}`
											: ''}
									</p>
								</td>
								<td>
									<p>{row.theatreName ?? '—'}</p>
									<p class="text-xs opacity-60">
										{formatOtDate(row.scheduledStart)}
										{formatOtTime(row.scheduledStart)}
									</p>
								</td>
								<td class="max-w-[14rem] truncate"
									>{row.procedureName || '—'}</td
								>
								<td
									><OtStatusBadge
										statusId={row.statusTaggingId}
										label={row.statusName}
									/></td
								>
							</tr>
						{:else}
							<tr
								><td colspan="5" class="text-center opacity-60"
									>No bookings in the selected range.</td
								></tr
							>
						{/each}
					</tbody>
				</table>
			</div>
			<footer
				class="flex flex-wrap items-center justify-between gap-2"
			>
				<WashSelect
					className="select-sm w-36"
					value={String(pageSize)}
					options={pageSizeOptions}
					onChange={(next) => {
						pageSize = Number(next) || 10;
						pageNo = 1;
						void loadList();
					}}
				/>
				<div class="flex items-center gap-2 text-sm">
					<span>{total} booking{total === 1 ? '' : 's'}</span>
					<WashButton
						variant="ghost"
						size="sm"
						className="cursor-pointer"
						disabled={pageNo <= 1}
						onClick={() => goPage(pageNo - 1)}>Prev</WashButton
					>
					<span>Page {pageNo} / {listResult?.totalPages ?? 1}</span>
					<WashButton
						variant="ghost"
						size="sm"
						className="cursor-pointer"
						disabled={pageNo >= (listResult?.totalPages ?? 1)}
						onClick={() => goPage(pageNo + 1)}>Next</WashButton
					>
				</div>
			</footer>
		</section>

		<section
			class="rounded-box min-h-0 overflow-y-auto border border-base-300"
		>
			{#if selected}
				<div
					class="sticky top-0 z-10 border-b border-base-300 bg-base-200/60 p-3"
				>
					<div
						class="flex flex-wrap items-start justify-between gap-2"
					>
						<div>
							<h2 class="text-lg font-bold text-primary">
								{selected.patientName}
							</h2>
							<p class="text-sm opacity-70">
								{selected.hrn ?? '—'} · {selected.ageGender} · {selected.bookingNo ??
									'Unbooked'}
							</p>
						</div>
						<OtStatusBadge
							statusId={selected.statusTaggingId}
							label={selected.statusName}
						/>
					</div>
					<div class="mt-2 flex flex-wrap gap-1">
						{#if can.book}
							<WashButton
								variant="primary"
								size="xs"
								className="cursor-pointer"
								onClick={openBook}>Book Theatre</WashButton
							>
						{/if}
						{#if can.confirm}
							<WashButton
								variant="primary"
								size="xs"
								className="cursor-pointer"
								loading={actionLoading}
								onClick={() =>
									changeStatus(OtBookingStatusTaggingEnum.CONFIRMED)}
								>Confirm</WashButton
							>
						{/if}
						{#if can.otPac}
							<WashButton
								variant="info"
								size="xs"
								className="cursor-pointer"
								loading={actionLoading}
								onClick={() =>
									changeStatus(OtBookingStatusTaggingEnum.OT_PAC)}
								>OT-PAC</WashButton
							>
						{/if}
						{#if can.checkIn}
							<WashButton
								variant="accent"
								size="xs"
								className="cursor-pointer"
								loading={actionLoading}
								onClick={() =>
									changeStatus(
										OtBookingStatusTaggingEnum.CHECKED_IN_PRE_OP
									)}>Check-In / Pre-Op</WashButton
							>
						{/if}
						{#if can.postOp}
							<WashButton
								variant="success"
								size="xs"
								className="cursor-pointer"
								loading={actionLoading}
								onClick={() =>
									changeStatus(OtBookingStatusTaggingEnum.POST_OP)}
								>Post-Op</WashButton
							>
						{/if}
						{#if can.abort}
							<WashButton
								variant="error"
								size="xs"
								className="cursor-pointer"
								onClick={() => {
									abortForm.reason = '';
									dialog = 'abort';
								}}>Abort</WashButton
							>
						{/if}
						{#if can.tag}
							<WashButton
								variant="secondary"
								size="xs"
								className="cursor-pointer"
								onClick={() => {
									tagForm.notes = selected?.clinicalNotes ?? '';
									dialog = 'tag';
								}}>Tag Patient</WashButton
							>
						{/if}
						{#if can.details}
							<WashButton
								variant="ghost"
								size="xs"
								className="cursor-pointer"
								onClick={openDetails}>Edit Details</WashButton
							>
						{/if}
						<WashButton
							variant="ghost"
							size="xs"
							className="cursor-pointer"
							onClick={() => {
								bloodForm = {
									bloodGroup: '',
									component: 'Packed red blood cells',
									units: '1',
									urgency: 'routine',
									notes: ''
								};
								dialog = 'blood';
							}}>Blood Requisition</WashButton
						>
					</div>
				</div>
				<div class="grid gap-3 p-3 text-sm sm:grid-cols-2">
					<div class="space-y-1">
						<p>
							<span class="opacity-60">Theatre:</span>
							{selected.theatreName ?? '—'}
						</p>
						<p>
							<span class="opacity-60">Date:</span>
							{formatOtDate(selected.scheduledStart)}
						</p>
						<p>
							<span class="opacity-60">Time:</span>
							{formatOtTime(selected.scheduledStart)} – {formatOtTime(
								selected.scheduledEnd
							)}
						</p>
						<p>
							<span class="opacity-60">Facility:</span>
							{selected.branchName ?? '—'}
						</p>
						<p>
							<span class="opacity-60">Encounter:</span>
							{selected.visitNo ?? '—'}
						</p>
						<p>
							<span class="opacity-60">Admission:</span>
							{selected.ipNo ?? 'OP'}
						</p>
					</div>
					<div class="space-y-1">
						<p>
							<span class="opacity-60">Surgeon:</span>
							{selected.surgeonName ?? '—'}
						</p>
						<p>
							<span class="opacity-60">Provider:</span>
							{selected.providerName ?? '—'}
						</p>
						<p>
							<span class="opacity-60">Paediatrician:</span>
							{selected.paediatricianName ?? '—'}
						</p>
						<p>
							<span class="opacity-60">Ward / Bed:</span>
							{selected.wardName ?? '—'}{selected.bedNo
								? ` / ${selected.bedNo}`
								: ''}
						</p>
						<p>
							<span class="opacity-60">Admitting doctor:</span>
							{selected.admittingDoctorName ?? '—'}
						</p>
						<p>
							<span class="opacity-60">Priority:</span>
							{selected.priority}
						</p>
					</div>
					<div
						class="rounded-box border border-base-300 p-2 sm:col-span-2"
					>
						<p class="font-semibold">Procedure</p>
						<p>{selected.procedureName || '—'}</p>
						<p class="mt-2 font-semibold">Provisional diagnosis</p>
						<p class="whitespace-pre-wrap">
							{selected.provisionalDiagnosis ?? '—'}
						</p>
						<p class="mt-2 font-semibold">Clinical notes</p>
						<p class="whitespace-pre-wrap">
							{selected.clinicalNotes ?? '—'}
						</p>
					</div>
					<div
						class="rounded-box border border-base-300 p-2 sm:col-span-2"
					>
						<div class="mb-2 flex items-center justify-between">
							<p class="font-semibold">Blood requisitions</p>
							<WashButton
								variant="ghost"
								size="xs"
								className="cursor-pointer"
								onClick={() => {
									bloodForm = {
										bloodGroup: '',
										component: 'Packed red blood cells',
										units: '1',
										urgency: 'routine',
										notes: ''
									};
									dialog = 'blood';
								}}>Add</WashButton
							>
						</div>
						{#each blood as b (b.id)}
							<p>
								{b.component} · {b.units} unit(s){b.bloodGroup
									? ` · ${b.bloodGroup}`
									: ''} · {b.urgency}
							</p>
						{:else}
							<p class="opacity-60">
								No blood requisitions recorded.
							</p>
						{/each}
					</div>
				</div>
			{:else}
				<div class="p-8 text-center text-sm opacity-60">
					Select a booking to see details and actions.
				</div>
			{/if}
		</section>
	</div>
</div>

<WashDialog
	open={dialog === 'book'}
	onClose={() => (dialog = null)}
	title="Book theatre"
	description={selected?.patientName}
>
	<div class="grid gap-3 sm:grid-cols-2">
		<label class="form-control min-w-0 sm:col-span-2">
			<span class="label-text text-xs">Theatre</span>
			<WashSelect
				className="select-sm"
				bind:value={bookForm.otRoomId}
				options={roomOptions}
			/>
		</label>
		<label class="form-control">
			<span class="label-text text-xs">Start</span>
			<WashInputField
				inputType="datetime-local"
				className="input-sm w-full"
				bind:value={bookForm.scheduledStart}
			/>
		</label>
		<label class="form-control">
			<span class="label-text text-xs">End</span>
			<WashInputField
				inputType="datetime-local"
				className="input-sm w-full"
				bind:value={bookForm.scheduledEnd}
			/>
		</label>
		<label class="form-control sm:col-span-2">
			<span class="label-text text-xs">Notes</span>
			<textarea
				class="textarea textarea-sm w-full"
				rows="2"
				bind:value={bookForm.notes}
			></textarea>
		</label>
	</div>
	{#snippet actions()}
		<WashButton
			variant="ghost"
			size="sm"
			className="cursor-pointer"
			onClick={() => (dialog = null)}>Cancel</WashButton
		>
		<WashButton
			variant="primary"
			size="sm"
			className="cursor-pointer"
			loading={actionLoading}
			disabled={actionLoading}
			onClick={saveBook}>Book</WashButton
		>
	{/snippet}
</WashDialog>

<WashDialog
	open={dialog === 'details'}
	onClose={() => (dialog = null)}
	title="Clinical details"
	description={selected?.patientName}
>
	<div class="grid gap-3 sm:grid-cols-2">
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Surgeon</span>
			<WashSelect
				className="select-sm"
				bind:value={detailsForm.surgeonId}
				options={surgeonOptions}
			/>
		</label>
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Provider / Anaesthetist</span>
			<WashSelect
				className="select-sm"
				bind:value={detailsForm.providerId}
				options={optionalStaffOptions}
			/>
		</label>
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Paediatrician</span>
			<WashSelect
				className="select-sm"
				bind:value={detailsForm.paediatricianId}
				options={optionalStaffOptions}
			/>
		</label>
		<label class="form-control">
			<span class="label-text text-xs">Duration (minutes)</span>
			<input
				class="input input-sm w-full"
				type="number"
				min="15"
				step="15"
				bind:value={detailsForm.durationMinutes}
			/>
		</label>
		<label class="form-control sm:col-span-2">
			<span class="label-text text-xs">Provisional diagnosis</span>
			<textarea
				class="textarea textarea-sm w-full"
				rows="2"
				bind:value={detailsForm.provisionalDiagnosis}
			></textarea>
		</label>
		<label class="form-control sm:col-span-2">
			<span class="label-text text-xs">Clinical notes</span>
			<textarea
				class="textarea textarea-sm w-full"
				rows="3"
				bind:value={detailsForm.clinicalNotes}
			></textarea>
		</label>
	</div>
	{#snippet actions()}
		<WashButton
			variant="ghost"
			size="sm"
			className="cursor-pointer"
			onClick={() => (dialog = null)}>Cancel</WashButton
		>
		<WashButton
			variant="primary"
			size="sm"
			className="cursor-pointer"
			loading={actionLoading}
			disabled={actionLoading}
			onClick={saveDetails}>Save</WashButton
		>
	{/snippet}
</WashDialog>

<WashDialog
	open={dialog === 'tag'}
	onClose={() => (dialog = null)}
	title="Tag patient for OT"
	description={selected?.patientName}
>
	<label class="form-control">
		<span class="label-text text-xs">Tagging note</span>
		<textarea
			class="textarea textarea-sm w-full"
			rows="3"
			bind:value={tagForm.notes}
			placeholder="Pre-op checklist, consent, site marking…"
		></textarea>
	</label>
	{#snippet actions()}
		<WashButton
			variant="ghost"
			size="sm"
			className="cursor-pointer"
			onClick={() => (dialog = null)}>Cancel</WashButton
		>
		<WashButton
			variant="primary"
			size="sm"
			className="cursor-pointer"
			loading={actionLoading}
			disabled={actionLoading}
			onClick={saveTag}>Tag patient</WashButton
		>
	{/snippet}
</WashDialog>

<WashDialog
	open={dialog === 'abort'}
	onClose={() => (dialog = null)}
	title="Abort OT booking"
	description={selected?.patientName}
>
	<label class="form-control">
		<span class="label-text text-xs">Abort reason *</span>
		<textarea
			class="textarea textarea-sm w-full"
			rows="3"
			bind:value={abortForm.reason}
		></textarea>
	</label>
	{#snippet actions()}
		<WashButton
			variant="ghost"
			size="sm"
			className="cursor-pointer"
			onClick={() => (dialog = null)}>Cancel</WashButton
		>
		<WashButton
			variant="error"
			size="sm"
			className="cursor-pointer"
			loading={actionLoading}
			disabled={actionLoading}
			onClick={saveAbort}>Abort booking</WashButton
		>
	{/snippet}
</WashDialog>

<WashDialog
	open={dialog === 'blood'}
	onClose={() => (dialog = null)}
	title="Blood requisition"
	description={selected?.patientName}
>
	<div class="grid gap-3 sm:grid-cols-2">
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Blood group</span>
			<WashSelect
				className="select-sm"
				bind:value={bloodForm.bloodGroup}
				options={bloodGroupOptions}
			/>
		</label>
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Component *</span>
			<WashSelect
				className="select-sm"
				bind:value={bloodForm.component}
				options={bloodComponentOptions}
			/>
		</label>
		<label class="form-control">
			<span class="label-text text-xs">Units *</span>
			<input
				class="input input-sm w-full"
				type="number"
				min="1"
				bind:value={bloodForm.units}
			/>
		</label>
		<label class="form-control min-w-0">
			<span class="label-text text-xs">Urgency</span>
			<WashSelect
				className="select-sm"
				bind:value={bloodForm.urgency}
				options={urgencyOptions}
			/>
		</label>
		<label class="form-control sm:col-span-2">
			<span class="label-text text-xs">Notes</span>
			<textarea
				class="textarea textarea-sm w-full"
				rows="2"
				bind:value={bloodForm.notes}
			></textarea>
		</label>
	</div>
	{#snippet actions()}
		<WashButton
			variant="ghost"
			size="sm"
			className="cursor-pointer"
			onClick={() => (dialog = null)}>Cancel</WashButton
		>
		<WashButton
			variant="primary"
			size="sm"
			className="cursor-pointer"
			loading={actionLoading}
			disabled={actionLoading}
			onClick={saveBlood}>Save requisition</WashButton
		>
	{/snippet}
</WashDialog>
