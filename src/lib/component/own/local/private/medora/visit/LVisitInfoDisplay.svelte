<script lang="ts">
	import { parseUuid } from '$lib/util/id.util';
	import {
		visitBarListUrl,
		type VisitBarPack
	} from '$lib/tool/medora/visit-bar-phase.util';
	import { fetchJsonCached } from '$lib/util/client-fetch-cache.util';
	import { m } from '$lib/paraglide/messages';
	import { formatMenziesTableDateTime } from '$lib/util/menzies-table-datetime.util';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import { getPatientPhotoDisplayUrl } from '$lib/util/staff-photo.util';
	import LVisitAlertIndicators from '$lib/component/own/local/private/medora/emr/LVisitAlertIndicators.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import type { VisitBarColorHints } from '$lib/model/type/medora/color-configuration.type';
	import { badgeInlineStyleFromColor } from '$lib/tool/color/hospital-color-resolve.util';
	import { DAISYUI_DEFAULT_HEX } from '$lib/tool/color/color-daisyui-default.util';

	let {
		visitId = '',
		hospitalId = '',
		emptyLabel = m.no_visit_selected(),
		onColorHints
	} = $props<{
		visitId?: string;
		hospitalId?: string;
		emptyLabel?: string;
		onColorHints?: (hints: VisitBarColorHints | null) => void;
	}>();

	let visit = $state<any>(null);
	let isLoading = $state(false);
	let visitTypeColor = $state<string | null>(null);
	let hasActiveAllergies = $state(false);
	let hasAbnormalVital = $state(false);
	const showAlerts = $derived(hasActiveAllergies || hasAbnormalVital);

	const visitIdParsed = $derived(parseUuid(visitId) ?? '');

	$effect(() => {
		const id = visitIdParsed;
		const hid =
			typeof hospitalId === 'string' && hospitalId.trim() !== ''
				? hospitalId.trim()
				: '';
		if (!id || !hid) {
			visit = null;
			visitTypeColor = null;
			return;
		}
		let cancelled = false;
		const ac = new AbortController();
		(async () => {
			isLoading = true;
			try {
				const url = visitBarListUrl(hid, String(id));
				const pack = await fetchJsonCached<
					VisitBarPack & {
						hasActiveAllergies?: boolean;
						hasAbnormalVital?: boolean;
						colorHints?: VisitBarColorHints | null;
					}
				>(url, { bypass: true, signal: ac.signal });
				if (!cancelled) {
					visit = pack.visit ?? null;
					visitTypeColor =
						pack.colorHints?.visitTypeBorderColor ?? null;
					hasActiveAllergies = pack.hasActiveAllergies ?? false;
					hasAbnormalVital = pack.hasAbnormalVital ?? false;
					onColorHints?.(pack.colorHints ?? null);
				}
			} catch {
				if (!cancelled) {
					visit = null;
					visitTypeColor = null;
					hasActiveAllergies = false;
					hasAbnormalVital = false;
					onColorHints?.(null);
				}
			} finally {
				if (!cancelled) isLoading = false;
			}
		})();
		return () => {
			cancelled = true;
			ac.abort();
		};
	});

	$effect(() => {
		if (!visit) {
			VisitState.setClinicalSignedAtFromVisit(null);
			return;
		}
		VisitState.setClinicalSignedAtFromVisit(
			visit.clinicalSignedAt != null &&
				typeof visit.clinicalSignedAt === 'string'
				? visit.clinicalSignedAt
				: null
		);
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
		formatMenziesTableDateTime(visit?.createdAt ?? null, '')
	);
	const branchName = $derived(visit?.branch?.name ?? '');
	const hospitalName = $derived(visit?.hospital?.name ?? '');
	const doctorName = $derived(
		visit?.doctor
			? StringUtil.doctorOptionDisplayName(
					visit.doctor as Parameters<
						typeof StringUtil.doctorOptionDisplayName
					>[0]
				)
			: ''
	);

	const patientPhotoUrl = $derived(
		getPatientPhotoDisplayUrl((visit?.patient as any)?.photoPath) ??
			(visit?.patient as any)?.photoPath ??
			''
	);
</script>

<div class="flex min-w-0 items-center gap-2.5">
	{#if visit && patientName}
		<div
			class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-base-300 text-base-content/60 sm:size-9"
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

	<div class="flex min-w-0 flex-1 flex-col gap-0.5">
		{#if isLoading}
			<div class="text-xs leading-tight text-base-content/60">
				Loading…
			</div>
		{:else if !visit}
			<div class="text-xs leading-tight text-base-content/60">
				{emptyLabel}
			</div>
		{:else}
			<div
				class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm leading-tight"
			>
				{#if visitNo}
					<div class="flex flex-wrap items-center gap-1">
						<span class="font-normal text-base-content/80"
							>Visit:</span
						>
						<span class="font-medium text-primary">
							{visitNo}
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

				{#if showAlerts}
					<div class="flex flex-wrap items-center gap-1">
						<span class="font-normal text-base-content/60"
							>Alert:</span
						>
						<span class="font-medium text-base-content">
							<LVisitAlertIndicators
								hasVitalAlert={hasAbnormalVital}
								hasAllergyAlert={hasActiveAllergies}
							/>
						</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if visitTypeName}
		<span
			class="badge badge-sm shrink-0"
			style={badgeInlineStyleFromColor(
				visitTypeColor ?? DAISYUI_DEFAULT_HEX.primary
			)}
		>
			{visitTypeName}
		</span>
	{/if}
</div>
