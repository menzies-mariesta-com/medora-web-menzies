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

	function formatVisitDate(value: string | null | undefined): string {
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

	const displayValue = $derived.by(() => {
		if (isLoading) return 'Loading…';
		if (!visit) return emptyLabel;
		const patientName = visit.patient
			? StringUtil.patientDisplayName(visit.patient as any)
			: '';
		const patientCode = visit.patient?.code ?? '';
		const visitNo = visit.visitNo ?? '';
		const visitDate = formatVisitDate(visit.createdAt ?? null);
		const hospitalName = visit.hospital?.name ?? '';
		const branchName = visit.branch?.name ?? '';
		const doctorName = visit.doctor
			? StringUtil.fullNameWithTitle(
					visit.doctor.title?.name ?? null,
					visit.doctor.firstName,
					visit.doctor.middleName,
					visit.doctor.lastName
				)
			: '';
		const visitTypeName = visit.visitType?.name ?? '';
		const branchAndHospital = [branchName, hospitalName].filter(Boolean).join(', ');
		const parts: string[] = [];
		if (visitTypeName) parts.push(visitTypeName);
		if (visitNo) parts.push(visitNo);
		if (patientCode) parts.push(patientCode);
		if (patientName) parts.push(patientName);
		if (doctorName) parts.push(doctorName);
		if (branchAndHospital) parts.push(branchAndHospital);
		if (visitDate) parts.push(visitDate);
		return parts.join(' · ') || emptyLabel;
	});
</script>

<div class="flex flex-col gap-1">
	<div class="text-xs font-semibold uppercase tracking-wide text-base-content/80">
		{title}
	</div>
	<div class="text-base font-medium leading-snug text-base-content text-primary">
		{displayValue}
	</div>
</div>
