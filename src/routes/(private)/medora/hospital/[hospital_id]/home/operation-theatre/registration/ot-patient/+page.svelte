<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import WashInputField from '$lib/component/wash/inputfield/WashInputField.svelte';
	import WashSelect from '$lib/component/wash/select/WashSelect.svelte';
	import OtPageHeader from '$lib/component/own/local/private/medora/operation-theatre/OtPageHeader.svelte';
	import type { OtOptions } from '$lib/model/type/medora/operation-theatre.type';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';
	import LucideSearch from '$lib/component/own/library/lucide/LucideSearch.svelte';

	type VisitRow = {
		visitId: string;
		visitNo: string | null;
		patientId: string;
		hrn: string | null;
		patientName: string;
		ageGender: string;
		dateOfBirth: string | null;
		mobileNo: string | null;
		admissionId: number | null;
		admissionNo: string | null;
		admittedAt: string | null;
	};

	const toast = new ToastService();
	const hospitalId = $derived(page.params.hospital_id ?? '');
	const apiBase = $derived(
		hospitalId
			? `/api/medora/hospital/${hospitalId}/home/operation-theatre`
			: ''
	);
	const today = new Date().toISOString().slice(0, 10);
	const visitIdParam = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);

	let options = $state<OtOptions | null>(null);
	let visits = $state<VisitRow[]>([]);
	let search = $state('');
	let loading = $state(false);
	let submitting = $state(false);
	let selected = $state<VisitRow | null>(null);
	let created = $state<{ id: number } | null>(null);
	let createdLabel = $state('');

	let form = $state({
		procedureName: '',
		serviceId: '',
		surgeonId: '',
		paediatricianId: '',
		providerId: '',
		provisionalDiagnosis: '',
		otRequestDate: today,
		durationMinutes: '60',
		priority: 'elective',
		notes: ''
	});

	const serviceOptions = $derived([
		{ value: '', label: 'Select service' },
		...(options?.services ?? []).map((service) => ({
			value: String(service.id),
			label: service.name
		}))
	]);
	const surgeonOptions = $derived([
		{ value: '', label: 'Select surgeon' },
		...(options?.surgeons ?? []).map((surgeon) => ({
			value: surgeon.id,
			label: surgeon.specialty
				? `${surgeon.name} · ${surgeon.specialty}`
				: surgeon.name
		}))
	]);
	const optionalStaffOptions = $derived([
		{ value: '', label: 'None' },
		...(options?.surgeons ?? []).map((surgeon) => ({
			value: surgeon.id,
			label: surgeon.name
		}))
	]);
	const priorityOptions = [
		{ value: 'elective', label: 'Elective' },
		{ value: 'urgent', label: 'Urgent' },
		{ value: 'emergency', label: 'Emergency' }
	];

	async function loadOptions() {
		if (!apiBase) return;
		const res = await fetch(`${apiBase}/options`);
		if (!res.ok) await throwUserFacingHttpError(res);
		options = (await res.json()) as OtOptions;
	}

	async function searchVisits() {
		if (!apiBase) return;
		loading = true;
		try {
			const q = new SvelteURLSearchParams({
				mode: 'visits',
				limit: '20'
			});
			if (search.trim()) q.set('search', search.trim());
			if (visitIdParam) q.set('visitId', visitIdParam);
			const res = await fetch(`${apiBase}/requests?${q.toString()}`);
			if (!res.ok) await throwUserFacingHttpError(res);
			visits = (await res.json()) as VisitRow[];
			if (visitIdParam && visits[0]) selected = visits[0];
		} catch (err) {
			toast.addErrorToast('Could not search patient encounters', err);
		} finally {
			loading = false;
		}
	}

	function selectVisit(row: VisitRow) {
		selected = row;
		created = null;
	}

	function applyService(value?: string) {
		form.serviceId = value ?? '';
		const service = options?.services.find(
			(s) => String(s.id) === form.serviceId
		);
		if (service && !form.procedureName.trim())
			form.procedureName = service.name;
	}

	async function createRequest() {
		if (!apiBase || !selected) return;
		if (!form.procedureName.trim()) {
			toast.addWarningToast('Enter the planned procedure.');
			return;
		}
		submitting = true;
		try {
			const res = await fetch(`${apiBase}/requests`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					action: 'create',
					visitId: selected.visitId,
					procedureName: form.procedureName,
					serviceId: form.serviceId || null,
					surgeonId: form.surgeonId || null,
					paediatricianId: form.paediatricianId || null,
					providerId: form.providerId || null,
					provisionalDiagnosis: form.provisionalDiagnosis,
					otRequestDate: form.otRequestDate,
					durationMinutes: Number(form.durationMinutes) || null,
					priority: form.priority,
					notes: form.notes
				})
			});
			if (!res.ok) await throwUserFacingHttpError(res);
			created = (await res.json()) as { id: number };
			createdLabel = `${selected.patientName} — ${form.procedureName}`;
			toast.addSuccessToast('OT request created.');
			form = {
				...form,
				procedureName: '',
				provisionalDiagnosis: '',
				notes: ''
			};
			await searchVisits();
		} catch (err) {
			toast.addErrorToast('Could not create the OT request', err);
		} finally {
			submitting = false;
		}
	}

	onMount(() => {
		void loadOptions();
		void searchVisits();
	});
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
	<OtPageHeader
		title="OT Patient Registration"
		description="Find an existing encounter and raise an Operation Theatre request."
		{loading}
		onRefresh={searchVisits}
	/>

	<WashCard>
		<WashCardBody className="gap-3">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<WashCardBodyTitle className="text-secondary"
					>Find encounter</WashCardBodyTitle
				>
				<span class="badge badge-ghost badge-sm"
					>{visits.length} result{visits.length === 1 ? '' : 's'}</span
				>
			</div>
		<form
			class="flex flex-wrap items-end gap-2"
			onsubmit={(e) => {
				e.preventDefault();
				void searchVisits();
			}}
		>
			<label class="form-control min-w-[16rem] flex-1">
				<span class="label-text text-xs"
					>Search patient / encounter</span
				>
				<input
					class="input input-sm w-full"
					bind:value={search}
					placeholder="HRN, patient name, visit no, mobile"
				/>
			</label>
			<WashButton
				type="submit"
				variant="primary"
				size="sm"
				className="cursor-pointer"
				{loading}
				disabled={loading}
			>
				<LucideSearch className="size-4" /> Search
			</WashButton>
			<WashButton
				variant="ghost"
				size="sm"
				className="cursor-pointer"
				onClick={() => {
					search = '';
					void searchVisits();
				}}>Clear</WashButton
			>
		</form>
		<div
			class="rounded-box mt-3 max-h-64 overflow-auto border border-base-300"
		>
			<table class="table-sm table-zebra table">
				<thead class="sticky top-0 bg-base-200">
					<tr>
						<th>Patient</th>
						<th>HRN</th>
						<th>Age / Gender</th>
						<th>Encounter</th>
						<th>Admission</th>
						<th>Action</th>
					</tr>
				</thead>
				<tbody>
					{#each visits as row (row.visitId)}
						<tr
							class={selected?.visitId === row.visitId
								? 'bg-primary/10'
								: ''}
						>
							<td>{row.patientName}</td>
							<td>{row.hrn ?? '—'}</td>
							<td>{row.ageGender}</td>
							<td>{row.visitNo ?? '—'}</td>
							<td>{row.admissionNo ?? 'OP'}</td>
							<td>
								<WashButton
									variant="ghost"
									size="xs"
									className="cursor-pointer"
									onClick={() => selectVisit(row)}
								>
									{selected?.visitId === row.visitId
										? 'Selected'
										: 'Select'}
								</WashButton>
							</td>
						</tr>
					{:else}
						<tr
							><td colspan="6" class="text-center opacity-60"
								>No encounters found.</td
							></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
		</WashCardBody>
	</WashCard>

	{#if selected}
		<WashCard>
			<WashCardBody className="gap-3">
			<div
				class="mb-3 flex flex-wrap items-start justify-between gap-2"
			>
				<div>
					<h2 class="font-bold text-secondary">
						{selected.patientName}
					</h2>
					<p class="text-sm opacity-70">
						HRN {selected.hrn ?? '—'} · {selected.ageGender} · Visit {selected.visitNo ??
							'—'}
						{#if selected.admissionNo}
							· Admission {selected.admissionNo}{/if}
					</p>
				</div>
				<a
					class="btn btn-ghost btn-sm"
					href={resolve(
						`/medora/hospital/${hospitalId}/home/operation-theatre/registration/list` as never
					)}>View requests</a
				>
			</div>
			<form
				class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
				onsubmit={(e) => {
					e.preventDefault();
					void createRequest();
				}}
			>
				<label class="form-control sm:col-span-2 lg:col-span-1">
					<span class="label-text text-xs">Planned procedure *</span>
					<input
						class="input input-sm w-full"
						bind:value={form.procedureName}
						required
						placeholder="e.g. Laparoscopic cholecystectomy"
					/>
				</label>
				<label class="form-control min-w-0">
					<span class="label-text text-xs">Service</span>
					<WashSelect
						className="select-sm"
						value={form.serviceId}
						options={serviceOptions}
						onChange={applyService}
					/>
				</label>
				<label class="form-control min-w-0">
					<span class="label-text text-xs">Surgeon</span>
					<WashSelect
						className="select-sm"
						bind:value={form.surgeonId}
						options={surgeonOptions}
					/>
				</label>
				<label class="form-control min-w-0">
					<span class="label-text text-xs">Paediatrician</span>
					<WashSelect
						className="select-sm"
						bind:value={form.paediatricianId}
						options={optionalStaffOptions}
					/>
				</label>
				<label class="form-control min-w-0">
					<span class="label-text text-xs"
						>Provider / Anaesthetist</span
					>
					<WashSelect
						className="select-sm"
						bind:value={form.providerId}
						options={optionalStaffOptions}
					/>
				</label>
				<label class="form-control">
					<span class="label-text text-xs">OT request date</span>
					<WashInputField
						inputType="date"
						className="input-sm w-full"
						bind:value={form.otRequestDate}
					/>
				</label>
				<label class="form-control">
					<span class="label-text text-xs"
						>Planned duration (minutes)</span
					>
					<input
						class="input input-sm w-full"
						type="number"
						min="15"
						step="15"
						bind:value={form.durationMinutes}
					/>
				</label>
				<label class="form-control min-w-0">
					<span class="label-text text-xs">Priority</span>
					<WashSelect
						className="select-sm"
						bind:value={form.priority}
						options={priorityOptions}
					/>
				</label>
				<label class="form-control sm:col-span-2 lg:col-span-3">
					<span class="label-text text-xs">Provisional diagnosis</span
					>
					<textarea
						class="textarea textarea-sm w-full"
						rows="2"
						bind:value={form.provisionalDiagnosis}
					></textarea>
				</label>
				<label class="form-control sm:col-span-2 lg:col-span-3">
					<span class="label-text text-xs">Clinical notes</span>
					<textarea
						class="textarea textarea-sm w-full"
						rows="2"
						bind:value={form.notes}
					></textarea>
				</label>
				<div
					class="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3"
				>
					<WashButton
						type="submit"
						variant="primary"
						size="sm"
						className="cursor-pointer"
						loading={submitting}
						disabled={submitting}
					>
						Create OT request
					</WashButton>
					<WashButton
						variant="ghost"
						size="sm"
						className="cursor-pointer"
						onClick={() => (selected = null)}
						>Clear selection</WashButton
					>
				</div>
			</form>
			{#if created}
				<div class="alert alert-success mt-3 text-sm">
					<span>OT request created for {createdLabel}.</span>
					<a
						class="link"
						href={resolve(
							`/medora/hospital/${hospitalId}/home/operation-theatre/booking-details?caseId=${created.id}` as never
						)}>Book theatre</a
					>
				</div>
			{/if}
		</WashCardBody>
		</WashCard>
	{:else}
		<div
			class="rounded-box border border-dashed border-base-300 p-6 text-center text-sm opacity-70"
		>
			Select a patient encounter above to raise a new OT request.
		</div>
	{/if}
</div>
