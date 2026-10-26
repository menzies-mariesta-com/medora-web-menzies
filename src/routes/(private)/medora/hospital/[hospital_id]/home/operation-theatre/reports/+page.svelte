<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import LVisitInfoBar from '$lib/component/own/local/private/medora/visit/LVisitInfoBar.svelte';
	import OtPageHeader from '$lib/component/own/local/private/medora/operation-theatre/OtPageHeader.svelte';
	import OtStatusBadge from '$lib/component/own/local/private/medora/operation-theatre/OtStatusBadge.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashCardBody from '$lib/component/wash/card/body/WashCardBody.svelte';
	import WashCardBodyTitle from '$lib/component/wash/card/body/title/WashCardBodyTitle.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import type {
		OtCaseSheet,
		OtCaseSheetCase
	} from '$lib/model/type/medora/operation-theatre.type';
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
	const initialVisitId = $derived(page.url.searchParams.get('visitId') ?? '');

	let visitId = $state('');
	let caseSheet = $state<OtCaseSheet | null>(null);
	let loading = $state(false);

	const noteLabels: Record<string, string> = {
		procedure_performed: 'Procedure performed',
		findings: 'Operative findings',
		complications: 'Complications / blood loss',
		specimens: 'Specimens sent',
		post_op_plan: 'Post-operative plan',
		indication: 'Indication',
		access_site: 'Access site',
		interventions: 'Interventions',
		fluoro_time_min: 'Fluoroscopy time (min)',
		dose_mgy: 'Dose (mGy)',
		contrast_ml: 'Contrast volume (ml)',
		devices: 'Devices implanted'
	};

	function noteEntries(note: Record<string, unknown> | null) {
		if (!note) return [];
		return Object.entries(note)
			.filter(([, value]) => value != null && String(value).trim() !== '')
			.map(([key, value]) => ({
				label: noteLabels[key] ?? key.replaceAll('_', ' '),
				value: String(value)
			}));
	}

	function dt(value: string | null | undefined) {
		if (!value) return '—';
		return `${formatOtDate(value)} ${formatOtTime(value)}`;
	}

	function dateOnly(value: string | null | undefined) {
		if (!value) return '—';
		return formatOtDate(value);
	}

	function caseTimeline(row: OtCaseSheetCase) {
		return [
			{ label: 'Ward to OT', value: row.wardToOtAt },
			{ label: 'Pre-op received', value: row.preOpAcknowledgedAt },
			{ label: 'In OT', value: row.inOtAt },
			{ label: 'Post-op', value: row.postOpAt },
			{ label: 'Returned to ward', value: row.returnedToWardAt }
		].filter((item) => item.value);
	}

	function updateVisitUrl(nextVisitId: string) {
		if (typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		if (nextVisitId) url.searchParams.set('visitId', nextVisitId);
		else url.searchParams.delete('visitId');
		window.history.replaceState({}, '', url);
	}

	async function load() {
		if (!apiBase || !visitId) {
			caseSheet = null;
			return;
		}
		loading = true;
		try {
			const res = await fetch(
				`${apiBase}/reports?visitId=${encodeURIComponent(visitId)}`
			);
			if (!res.ok) await throwUserFacingHttpError(res);
			const result = (await res.json()) as {
				caseSheet: OtCaseSheet;
			};
			caseSheet = result.caseSheet;
		} catch (err) {
			toast.addErrorToast('Could not load the OT case sheet', err);
			caseSheet = null;
		} finally {
			loading = false;
		}
	}

	function selectVisit(nextVisitId: string) {
		visitId = nextVisitId;
		updateVisitUrl(nextVisitId);
		void load();
	}

	function resetVisit() {
		visitId = '';
		updateVisitUrl('');
		caseSheet = null;
	}

	function printCaseSheet() {
		if (typeof window !== 'undefined') window.print();
	}

	onMount(() => {
		if (initialVisitId) {
			visitId = initialVisitId;
			void load();
		}
	});
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 print:block print:p-0">
	<div class="no-print">
		<OtPageHeader
			title="OT Case Sheet"
			description="Select an encounter to print the complete OT case sheet, including procedure notes, handoff times, blood requisitions and billing."
			onRefresh={load}
		/>
	</div>

	<div class="no-print">
		<LVisitInfoBar
			{visitId}
			{hospitalId}
			onVisitSelected={(data) => selectVisit(data.visitId)}
			onVisitReset={resetVisit}
		/>
	</div>

	{#if !visitId}
		<WashCard>
			<WashCardBody>
				<div class="flex flex-col items-center gap-2 py-12 text-center">
					<p class="font-semibold">Select an encounter</p>
					<p class="max-w-lg text-sm opacity-70">
						Use the encounter selector above to load the OT case
						sheet. The report includes patient demographics,
						procedures, signed operative notes, timeline, blood
						requisitions and the OT bill.
					</p>
				</div>
			</WashCardBody>
		</WashCard>
	{:else if loading}
		<div class="flex items-center justify-center py-12">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if caseSheet}
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<p class="text-lg font-bold">
					{caseSheet.patientName}
				</p>
				<p class="text-sm opacity-70">
					{caseSheet.hrn ?? '—'} · {caseSheet.ageGender} ·
					{caseSheet.visitNo ?? '—'}
				</p>
			</div>
			<WashButton
				variant="primary"
				size="sm"
				className="no-print cursor-pointer"
				onClick={printCaseSheet}
			>
				<LucidePrinter className="size-4" />
				Print case sheet
			</WashButton>
		</div>

		<WashCard>
			<WashCardBody className="gap-3">
				<WashCardBodyTitle className="text-secondary"
					>Patient & encounter</WashCardBodyTitle
				>
				<div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
					<div>
						<p class="text-xs opacity-60">Patient</p>
						<p class="font-semibold">{caseSheet.patientName}</p>
						<p class="opacity-75">{caseSheet.hrn ?? '—'}</p>
					</div>
					<div>
						<p class="text-xs opacity-60">Age / gender</p>
						<p>{caseSheet.ageGender}</p>
						<p class="opacity-75">
							DOB: {dateOnly(caseSheet.dateOfBirth)}
						</p>
					</div>
					<div>
						<p class="text-xs opacity-60">Encounter</p>
						<p>{caseSheet.visitNo ?? '—'}</p>
						<p class="opacity-75">
							{dateOnly(caseSheet.visitDate)} · {caseSheet.visitStatus ?? '—'}
						</p>
					</div>
					<div>
						<p class="text-xs opacity-60">Facility</p>
						<p>{caseSheet.branchName ?? '—'}</p>
						<p class="opacity-75">{caseSheet.mobileNo ?? '—'}</p>
					</div>
					<div>
						<p class="text-xs opacity-60">Admission</p>
						<p>{caseSheet.admissionNo ?? 'Not admitted'}</p>
						<p class="opacity-75">
							Admitted: {dt(caseSheet.admittedAt)}
						</p>
					</div>
					<div>
						<p class="text-xs opacity-60">Ward / bed</p>
						<p>{caseSheet.wardName ?? '—'}</p>
						<p class="opacity-75">{caseSheet.bedNo ?? '—'}</p>
					</div>
					<div>
						<p class="text-xs opacity-60">Attending doctor</p>
						<p>{caseSheet.attendingDoctorName ?? '—'}</p>
					</div>
					<div>
						<p class="text-xs opacity-60">Discharged</p>
						<p>{dt(caseSheet.dischargedAt)}</p>
					</div>
				</div>
			</WashCardBody>
		</WashCard>

		{#if caseSheet.cases.length === 0}
			<WashCard>
				<WashCardBody>
					<p class="py-6 text-center text-sm opacity-70">
						No OT cases recorded for this encounter.
					</p>
				</WashCardBody>
			</WashCard>
		{/if}

		{#each caseSheet.cases as row (row.id)}
			<WashCard>
				<WashCardBody className="gap-3">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div>
							<WashCardBodyTitle className="text-secondary">
								{row.procedureName || 'OT procedure'}
							</WashCardBodyTitle>
							<p class="text-xs opacity-70">
								{row.bookingNo ?? '—'} · {row.theatreName ?? 'Theatre not assigned'}
							</p>
						</div>
						<OtStatusBadge
							statusId={row.statusTaggingId}
							label={row.statusName}
						/>
					</div>

					<div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
						<div>
							<p class="text-xs opacity-60">OT date</p>
							<p>{dateOnly(row.otDate)}</p>
							<p class="opacity-75">
								{formatOtTime(row.scheduledStart)} – {formatOtTime(row.scheduledEnd)}
							</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Surgeon</p>
							<p>{row.surgeonName ?? '—'}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Anaesthetist / provider</p>
							<p>{row.providerName ?? '—'}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Paediatrician</p>
							<p>{row.paediatricianName ?? '—'}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Service</p>
							<p>{row.serviceName ?? '—'}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Priority</p>
							<p class="capitalize">{row.priority}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Ward / bed</p>
							<p>{row.wardName ?? '—'} / {row.bedNo ?? '—'}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Procedure signed</p>
							<p>{row.procedureSignedAt ? dt(row.procedureSignedAt) : 'Not signed'}</p>
							<p class="opacity-75">{row.procedureSignedByName ?? ''}</p>
						</div>
					</div>

					{#if row.provisionalDiagnosis || row.clinicalNotes || row.wardRemarks}
						<div class="rounded-box bg-base-200/60 p-3 text-sm">
							{#if row.provisionalDiagnosis}
								<p>
									<span class="font-semibold">Diagnosis:</span>
									{row.provisionalDiagnosis}
								</p>
							{/if}
							{#if row.clinicalNotes}
								<p>
									<span class="font-semibold">Clinical notes:</span>
									{row.clinicalNotes}
								</p>
							{/if}
							{#if row.wardRemarks}
								<p>
									<span class="font-semibold">Ward remarks:</span>
									{row.wardRemarks}
								</p>
							{/if}
						</div>
					{/if}

					{#if caseTimeline(row).length > 0}
						<div>
							<p class="mb-1 text-xs font-semibold uppercase opacity-60">
								Handoff timeline
							</p>
							<div class="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
								{#each caseTimeline(row) as item (item.label)}
									<div class="rounded-box border border-base-300 p-2">
										<p class="text-xs opacity-60">{item.label}</p>
										<p>{dt(item.value)}</p>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if noteEntries(row.procedureNote).length > 0}
						<div>
							<p class="mb-1 text-xs font-semibold uppercase opacity-60">
								Signed operative note
							</p>
							<div class="grid gap-2 text-sm sm:grid-cols-2">
								{#each noteEntries(row.procedureNote) as item (item.label)}
									<div class="rounded-box bg-base-200/60 p-2">
										<p class="text-xs opacity-60">{item.label}</p>
										<p class="whitespace-pre-wrap">{item.value}</p>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</WashCardBody>
			</WashCard>
		{/each}

		{#if caseSheet.bloodRequisitions.length > 0}
			<WashCard>
				<WashCardBody className="gap-3">
					<WashCardBodyTitle className="text-secondary"
						>Blood requisitions</WashCardBodyTitle
					>
					<div class="overflow-x-auto">
						<table class="table table-sm">
							<thead>
								<tr>
									<th>Requested</th>
									<th>Group</th>
									<th>Component</th>
									<th>Units</th>
									<th>Urgency</th>
									<th>Notes</th>
								</tr>
							</thead>
							<tbody>
								{#each caseSheet.bloodRequisitions as blood (blood.id)}
									<tr>
										<td>{dt(blood.requestedAt)}</td>
										<td>{blood.bloodGroup ?? '—'}</td>
										<td>{blood.component}</td>
										<td>{blood.units}</td>
										<td class="capitalize">{blood.urgency}</td>
										<td>{blood.notes ?? '—'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</WashCardBody>
			</WashCard>
		{/if}

		<WashCard>
			<WashCardBody className="gap-3">
				<WashCardBodyTitle className="text-secondary"
					>OT billing</WashCardBodyTitle
				>
				{#if caseSheet.bill}
					<div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
						<div>
							<p class="text-xs opacity-60">Bill no</p>
							<p class="font-semibold">{caseSheet.bill.billNo ?? '—'}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Status</p>
							<p>{caseSheet.bill.statusName ?? '—'}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Subtotal</p>
							<p>{caseSheet.bill.linesSubtotal}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Total</p>
							<p class="font-bold">{caseSheet.bill.totalAmount}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Transferred</p>
							<p>{dt(caseSheet.bill.transferredAt)}</p>
						</div>
						<div>
							<p class="text-xs opacity-60">Closed</p>
							<p>{dt(caseSheet.bill.closedAt)}</p>
						</div>
					</div>
				{:else}
					<p class="text-sm opacity-70">
						No OT bill has been transferred for this encounter.
					</p>
				{/if}
			</WashCardBody>
		</WashCard>
	{:else if visitId}
		<WashCard>
			<WashCardBody>
				<p class="py-8 text-center text-sm opacity-70">
					No case sheet data is available for the selected encounter.
				</p>
			</WashCardBody>
		</WashCard>
	{/if}
</div>

<style>
	@media print {
		:global(body) {
			background: white !important;
		}
		:global(.no-print) {
			display: none !important;
		}
	}
</style>
