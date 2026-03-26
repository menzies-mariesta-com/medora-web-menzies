<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { getPatientPhotoDisplayUrl } from '$lib/util/staff-photo.util';
	import LucideTriangleAlert from '$lib/component/own/library/lucide/LucideTriangleAlert.svelte';
	import {
		getPatientVisitByIdWithRelations,
		type PatientVisitWithRelations
	} from '$lib/remote/table/information-table/patient-visit.remote';
	import {
		getActivePatientAllergiesPatientIdsByPatientIds
	} from '$lib/remote/table/information-table/patient-allergies.remote';

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
	let hasActiveAllergies = $state(false);
	let alert = $state(false);

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

	$effect(() => {
		const patientId = visit?.patient?.id;
		if (!patientId) {
			hasActiveAllergies = false;
			return;
		}

		let cancelled = false;
		hasActiveAllergies = false;

		(async () => {
			const activeIds =
				await getActivePatientAllergiesPatientIdsByPatientIds({
					patientIds: [String(patientId)]
				});
			if (!cancelled) {
				hasActiveAllergies = activeIds.includes(String(patientId));
				alert = true;
			}
		})().catch(() => {
			if (!cancelled) {
				hasActiveAllergies = false;
				alert = false;
			}
		});

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

	const patientPhotoUrl = $derived(
		getPatientPhotoDisplayUrl((visit?.patient as any)?.photoPath) ??
			(visit?.patient as any)?.photoPath ??
			''
	);
</script>

<div class="flex min-w-0 items-center gap-4">
	{#if visit && patientName}
		<div
			class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-base-300 text-base-content/60 sm:size-18"
			aria-hidden="true"
		>
			{#if patientPhotoUrl}
				<img
					src={patientPhotoUrl}
					alt={`${patientName} profile`}
					class="size-full object-cover"
				/>
			{:else}
				<span class="text-sm font-semibold uppercase">
					{patientName.charAt(0)}
				</span>
			{/if}
		</div>
	{/if}

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
			<div
				class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm"
			>
				{#if visitNo || visitTypeName}
					<div class="flex flex-wrap items-center gap-1">
						<span class="font-normal text-base-content/60"
							>Visit:</span
						>
						<span class="font-medium text-primary">
							{#if visitNo}{visitNo}{/if}{#if visitTypeName}
								{#if visitNo}<span class="text-base-content/60">
										·
									</span>{/if}
								{visitTypeName}
							{/if}
						</span>
					</div>
				{/if}

				{#if patientName || patientCode}
					<div class="flex flex-wrap items-center gap-1">
						<span class="font-normal text-base-content/60"
							>Patient:</span
						>
						<span class="font-medium">
							{#if patientName}{patientName}{/if}
							{#if patientCode}
								{#if patientName}<span class="text-base-content/60">
										·
									</span>{/if}
								<span class="text-base-content/80">{patientCode}</span
								>
							{/if}
							{#if patientDob}
								<span class="text-base-content/60">
									· {patientDob}</span
								>
							{/if}
						</span>
					</div>
				{/if}

				{#if doctorName}
					<div class="flex flex-wrap items-center gap-1">
						<span class="font-normal text-base-content/60"
							>Doctor:</span
						>
						<span class="font-medium text-base-content">
							{doctorName}
						</span>
					</div>
				{/if}

				{#if branchName || hospitalName}
					<div class="flex flex-wrap items-center gap-1">
						<span class="font-normal text-base-content/60"
							>Location:</span
						>
						<span class="font-medium text-base-content">
							{[branchName, hospitalName].filter(Boolean).join(' · ')}
						</span>
					</div>
				{/if}

				{#if visitDate}
					<div class="flex flex-wrap items-center gap-1">
						<span class="font-normal text-base-content/60"
							>Visit Date:</span
						>
						<span class="font-medium text-base-content">
							{visitDate}
						</span>
					</div>
				{/if}

				{#if alert}
					<div class="flex flex-wrap items-center gap-1">
						<span class="font-normal text-base-content/60"
							>Alert:</span
						>
						<span class="font-medium text-base-content">
							{#if hasActiveAllergies}
								<span
									aria-label={m.observation_emr_allergies()}
									title={m.observation_emr_allergies()}
									class="inline-flex items-center text-warning"
								>
									<LucideTriangleAlert className="size-4" />
								</span>
							{/if}
						</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
