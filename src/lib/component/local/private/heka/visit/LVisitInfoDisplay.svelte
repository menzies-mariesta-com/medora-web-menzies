<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import {
		getPatientVisitByIdWithRelations,
		type PatientVisitWithRelations
	} from '$lib/remote/table/information-table/patient-visit.remote';

	let {
		visitId = '',
		title = m.selected_visit(),
		emptyLabel = m.no_visit_selected()
	} = $props<{
		visitId?: string;
		title?: string;
		emptyLabel?: string;
	}>();

	let visit = $state<PatientVisitWithRelations | null>(null);
	let isLoading = $state(false);

	const visitIdNum = $derived(visitId ? Number(visitId) : 0);

	$effect(() => {
		const id = visitIdNum;
		if (!id || Number.isNaN(id)) {
			visit = null;
			return;
		}
		let cancelled = false;
		(async () => {
			isLoading = true;
			try {
				const v = await getPatientVisitByIdWithRelations({ id });
				if (!cancelled) visit = v;
			} finally {
				if (!cancelled) isLoading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	function formatDate(
		value: string | Date | null | undefined
	): string {
		if (value == null) return '';
		try {
			const d = typeof value === 'string' ? new Date(value) : value;
			return Number.isNaN(d.getTime())
				? ''
				: d.toLocaleDateString('en-US', { dateStyle: 'short' });
		} catch {
			return '';
		}
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '';
		try {
			return new Date(value).toLocaleString('en-US', {
				dateStyle: 'short',
				timeStyle: 'short'
			});
		} catch {
			return '';
		}
	}

	const patientName = $derived(
		visit?.patient
			? StringUtil.patientDisplayName(visit.patient as any)
			: ''
	);
	const patientCode = $derived(visit?.patient?.code ?? '');
	const patientDob = $derived(
		formatDate(visit?.patient?.dateOfBirth)
	);
	const visitNo = $derived(visit?.visitNo ?? '');
	const visitTypeName = $derived(visit?.visitType?.name ?? '');
	const visitDate = $derived(
		formatDateTime(visit?.createdAt ?? null)
	);
	const branchName = $derived(visit?.branch?.name ?? '');
	const hospitalName = $derived(visit?.hospital?.name ?? '');
	const doctorName = $derived(
		visit?.doctor
			? StringUtil.fullNameWithTitle(
					visit.doctor.title?.name ?? null,
					visit.doctor.firstName,
					visit.doctor.middleName,
					visit.doctor.lastName
				)
			: ''
	);
</script>

<div class="flex min-w-0 flex-col gap-2">
	<div
		class="text-xs font-semibold tracking-wide text-base-content/70 uppercase"
	>
		{title}
	</div>

	{#if isLoading}
		<div class="text-sm text-base-content/60">Loading…</div>
	{:else if !visit}
		<div class="text-sm text-base-content/60">{emptyLabel}</div>
	{:else}
		<dl
			class="visit-info-grid grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3"
		>
			{#if visitNo || visitTypeName}
				<div class="visit-info-item">
					<dt class="font-normal text-base-content/60">Visit</dt>
					<dd class="font-medium text-primary">
						{#if visitNo}{visitNo}{/if}{#if visitTypeName}
							{#if visitNo}<span class="text-base-content/60">
									·
								</span>{/if}
							{visitTypeName}
						{/if}
					</dd>
				</div>
			{/if}
			{#if patientName || patientCode}
				<div class="visit-info-item">
					<dt class="font-normal text-base-content/60">Patient</dt>
					<dd class="font-medium">
						{#if patientName}{patientName}{/if}
						{#if patientCode}
							{#if patientName}<span class="text-base-content/60">
									·
								</span>{/if}
							<span class="text-base-content/80">{patientCode}</span>
						{/if}
						{#if patientDob}
							<span class="text-base-content/60">
								· {patientDob}</span
							>
						{/if}
					</dd>
				</div>
			{/if}
			{#if doctorName}
				<div class="visit-info-item">
					<dt class="font-normal text-base-content/60">Doctor</dt>
					<dd class="font-medium text-base-content">{doctorName}</dd>
				</div>
			{/if}
			{#if branchName || hospitalName}
				<div class="visit-info-item">
					<dt class="font-normal text-base-content/60">Location</dt>
					<dd class="font-medium text-base-content">
						{[branchName, hospitalName].filter(Boolean).join(' · ')}
					</dd>
				</div>
			{/if}
			{#if visitDate}
				<div class="visit-info-item">
					<dt class="font-normal text-base-content/60">Visit Date</dt>
					<dd class="font-medium text-base-content">{visitDate}</dd>
				</div>
			{/if}
		</dl>
	{/if}
</div>

<style>
	.visit-info-grid .visit-info-item {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 0.75rem;
		align-items: baseline;
		min-width: 0;
	}
	.visit-info-grid .visit-info-item dt {
		margin: 0;
	}
	.visit-info-grid .visit-info-item dd {
		margin: 0;
		min-width: 0;
	}
</style>
