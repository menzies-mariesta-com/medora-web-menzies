<script lang="ts">
	import type {
		PatientDiagnosisListRow,
		ServiceOrderDetailListRow
	} from '$lib/model/type/heka/ui-rows.type';
	import { m } from '$lib/paraglide/messages';
	import { formatNumberDisplay } from '$lib/util/number-display.util';
	import { StringUtil } from '$lib/util/string.util.svelte';

	type PatientVisitWithRelations = {
		id?: number;
		visitNo?: string | null;
		createdAt?: string | Date | null;
		patient?: {
			code?: string | null;
			firstName?: string | null;
			middleName?: string | null;
			lastName?: string | null;
		} | null;
	};
	type PatientAllergyWithRelations = {
		id: number;
		statusId?: number | null;
		reaction?: string | null;
		createdBy?: string | null;
		updatedBy?: string | null;
		createdAt?: string | null;
		updatedAt?: string | null;
		allergy?: { name?: string | null } | null;
		severity?: { name?: string | null } | null;
	};
	type DiagnosisWithType = {
		id: number;
		description?: string | null;
		statusId?: number | null;
		createdBy?: string | null;
		updatedBy?: string | null;
		createdAt?: string | null;
		updatedAt?: string | null;
		diagnosisType?: { name?: string | null } | null;
	};
	type PatientFormEntryWithRelations = {
		id: number;
		description?: string | null;
		createdBy?: string | null;
		updatedBy?: string | null;
		createdAt?: string | null;
		updatedAt?: string | null;
	};
	type OrderDetailVisitRow = ServiceOrderDetailListRow & {
		orderNo: string | null;
		serviceName: string | null;
	};

	let {
		visitRow,
		allergies = [],
		vitals = [],
		orderLines = [],
		visitDiagnoses = [],
		chiefComplaintEntries = [],
		patientConditionEntries = [],
		userDisplayById = {},
		compact = false
	}: {
		visitRow: PatientVisitWithRelations;
		allergies?: PatientAllergyWithRelations[];
		vitals?: PatientDiagnosisListRow[];
		orderLines?: OrderDetailVisitRow[];
		visitDiagnoses?: DiagnosisWithType[];
		chiefComplaintEntries?: PatientFormEntryWithRelations[];
		patientConditionEntries?: PatientFormEntryWithRelations[];
		userDisplayById?: Record<string, string>;
		compact?: boolean;
	} = $props();

	function formatVital(value: unknown): string {
		if (value == null || value === '') return '–';
		return String(value);
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '–';
		try {
			return new Date(value).toLocaleString('en-US', {
				dateStyle: 'short',
				timeStyle: 'short'
			});
		} catch {
			return '–';
		}
	}

	function getVitalDisplayDate(
		v: PatientDiagnosisListRow
	): string | null {
		return v.vitalDateTime ?? v.createdAt ?? null;
	}

	function formatText(value: string | null | undefined): string {
		if (value == null || value === '') return '–';
		return String(value);
	}

	function formatUserName(userId: string | null | undefined): string {
		if (!userId) return '–';
		return userDisplayById[userId]?.trim() || '–';
	}

	const patientDisplayName = $derived(
		visitRow?.patient
			? StringUtil.patientDisplayName(visitRow.patient as any)
			: '–'
	);
</script>

<article class="case-sheet-document" class:case-sheet-compact={compact}>
	<header class="case-sheet-header">
		<h2 class="case-sheet-doc-title">
			{m.nursing_case_sheet_title()}
		</h2>
		<dl class="case-sheet-meta">
			<div>
				<dt>{m.visit_history_visit_label_visit_no()}</dt>
				<dd>{formatText(visitRow.visitNo ?? null)}</dd>
			</div>
			<div>
				<dt>{m.visit_history_visit_label_patient()}</dt>
				<dd>{patientDisplayName}</dd>
			</div>
			{#if visitRow.patient?.code}
				<div>
					<dt>{m.visit_history_visit_label_patient_code()}</dt>
					<dd>{visitRow.patient.code}</dd>
				</div>
			{/if}
			<div>
				<dt>{m.visit_history_visit_label_visit_date()}</dt>
				<dd>{formatDateTime(visitRow.createdAt as string | null | undefined)}</dd>
			</div>
		</dl>
	</header>

	<section class="case-sheet-section">
		<h3>{m.observation_emr_chief_complaint()}</h3>
		{#if chiefComplaintEntries.length === 0}
			<p class="case-sheet-empty">
				{m.nursing_case_sheet_no_entries()}
			</p>
		{:else}
			<ol class="case-sheet-list">
				{#each chiefComplaintEntries as row (row.id)}
					<li>
						<div>{formatText(row.description ?? null)}</div>
						<p class="case-sheet-audit">
							Entered by {formatUserName(row.createdBy ?? null)} on
							{formatDateTime(row.createdAt ?? undefined)}
							· Updated by {formatUserName(row.updatedBy ?? null)} on
							{formatDateTime(row.updatedAt ?? undefined)}
						</p>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<section class="case-sheet-section">
		<h3>{m.observation_emr_patient_condition()}</h3>
		{#if patientConditionEntries.length === 0}
			<p class="case-sheet-empty">
				{m.nursing_case_sheet_no_entries()}
			</p>
		{:else}
			<ol class="case-sheet-list">
				{#each patientConditionEntries as row (row.id)}
					<li>
						<div>{formatText(row.description ?? null)}</div>
						<p class="case-sheet-audit">
							Entered by {formatUserName(row.createdBy ?? null)} on
							{formatDateTime(row.createdAt ?? undefined)}
							· Updated by {formatUserName(row.updatedBy ?? null)} on
							{formatDateTime(row.updatedAt ?? undefined)}
						</p>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<section class="case-sheet-section">
		<h3>{m.observation_emr_diagnosis()}</h3>
		{#if visitDiagnoses.length === 0}
			<p class="case-sheet-empty">
				{m.observation_emr_diagnosis_empty()}
			</p>
		{:else}
			<ol class="case-sheet-list">
				{#each visitDiagnoses as row (row.id)}
					<li>
						<div>
							{formatText(row.description ?? null)}
							{#if row.diagnosisType?.name}
								<span class="case-sheet-muted">
									({m.observation_emr_diagnosis_type_label()}: {row
										.diagnosisType.name})
								</span>
							{/if}
						</div>
						<p class="case-sheet-audit">
							Entered by {formatUserName(row.createdBy ?? null)} on
							{formatDateTime(row.createdAt ?? undefined)}
							· Updated by {formatUserName(row.updatedBy ?? null)} on
							{formatDateTime(row.updatedAt ?? undefined)}
						</p>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<section class="case-sheet-section">
		<h3>{m.observation_emr_allergies()}</h3>
		{#if allergies.length === 0}
			<p class="case-sheet-empty">
				{m.observation_emr_allergy_empty()}
			</p>
		{:else}
			<ol class="case-sheet-list">
				{#each allergies as row (row.id)}
					<li>
						<div>
							<strong>{formatText(row.allergy?.name ?? null)}</strong>
							{m.nursing_case_sheet_allergy_severity()}:
							{formatText(row.severity?.name ?? null)};
							{m.nursing_case_sheet_allergy_reaction()}:
							{formatText(row.reaction ?? null)}
						</div>
						<p class="case-sheet-audit">
							Entered by {formatUserName(row.createdBy ?? null)} on
							{formatDateTime(row.createdAt ?? undefined)}
							· Updated by {formatUserName(row.updatedBy ?? null)} on
							{formatDateTime(row.updatedAt ?? undefined)}
						</p>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

	<section class="case-sheet-section">
		<h3>{m.observation_emr_vitals()}</h3>
		{#if vitals.length === 0}
			<p class="case-sheet-empty">
				{m.nursing_case_sheet_no_entries()}
			</p>
		{:else}
			<div class="case-sheet-table-wrap">
				<table class="case-sheet-table">
					<thead>
						<tr>
							<th>{m.nursing_case_sheet_col_date()}</th>
							<th>{m.nursing_case_sheet_col_height_cm()}</th>
							<th>{m.nursing_case_sheet_col_weight_kg()}</th>
							<th>{m.nursing_case_sheet_col_bmi()}</th>
							<th>{m.nursing_case_sheet_col_bp()}</th>
							<th>{m.nursing_case_sheet_col_pulse()}</th>
							<th>{m.nursing_case_sheet_col_temp()}</th>
							<th>{m.nursing_case_sheet_col_spo2()}</th>
							<th>{m.nursing_case_sheet_col_symptom()}</th>
						</tr>
					</thead>
					<tbody>
						{#each vitals as row (row.id)}
							<tr>
								<td>{formatDateTime(getVitalDisplayDate(row))}</td>
								<td>{formatVital(row.height)}</td>
								<td>{formatVital(row.weight)}</td>
								<td>{formatVital(row.bmi)}</td>
								<td
									>{formatVital(row.bpSystolic)}/{formatVital(
										row.bpDiastolic
									)}</td
								>
								<td>{formatVital(row.pulse)}</td>
								<td>{formatVital(row.temperature)}</td>
								<td>{formatVital(row.spO2)}</td>
								<td>
									<div>{formatVital(row.symptom)}</div>
									<p class="case-sheet-audit">
										Entered by {formatUserName(
											row.createdBy as string | null
										)} on
										{formatDateTime(
											row.createdAt as string | null | undefined
										)}
										· Updated by {formatUserName(
											row.updatedBy as string | null
										)} on
										{formatDateTime(
											row.updatedAt as string | null | undefined
										)}
									</p>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<section class="case-sheet-section">
		<h3>{m.observation_emr_order_history()}</h3>
		{#if orderLines.length === 0}
			<p class="case-sheet-empty">
				{m.nursing_case_sheet_no_entries()}
			</p>
		{:else}
			<div class="case-sheet-table-wrap">
				<table class="case-sheet-table">
					<thead>
						<tr>
							<th>{m.nursing_case_sheet_col_order_no()}</th>
							<th>{m.observation_emr_service()}</th>
							<th>{m.nursing_case_sheet_col_description()}</th>
							<th>{m.observation_emr_service_amount()}</th>
							<th>{m.observation_emr_units()}</th>
							<th>{m.observation_emr_urgent()}</th>
						</tr>
					</thead>
					<tbody>
						{#each orderLines as row (row.id)}
							<tr>
								<td>{formatText(row.orderNo)}</td>
								<td>
									{formatText(
										row.serviceName ?? `Service ${row.serviceId}`
									)}
								</td>
								<td>
									<div>{formatText(row.instruction ?? null)}</div>
									<p class="case-sheet-audit">
										Entered by {formatUserName(
											row.createdBy as string | null
										)} on
										{formatDateTime(
											row.createdAt as string | null | undefined
										)}
										· Updated by {formatUserName(
											row.updatedBy as string | null
										)} on
										{formatDateTime(
											row.updatedAt as string | null | undefined
										)}
									</p>
								</td>
								<td>{formatNumberDisplay(row.serviceAmount)}</td>
								<td>
									{row.serviceUnit != null
										? String(row.serviceUnit)
										: '–'}
								</td>
								<td>
									{row.isUrgent
										? m.nursing_case_sheet_yes()
										: m.nursing_case_sheet_no()}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<footer class="case-sheet-footer">
		{m.nursing_case_sheet_generated()}:
		{new Date().toLocaleString('en-US', {
			dateStyle: 'short',
			timeStyle: 'short'
		})}
	</footer>
</article>

<style>
	.case-sheet-document {
		max-width: 52rem;
		margin: 0 auto;
		padding: 1.75rem 1.5rem 2rem;
		background: var(--fallback-b1, oklch(var(--b1)));
		color: var(--fallback-bc, oklch(var(--bc)));
		border: 1px solid color-mix(in oklab, currentColor 12%, transparent);
		border-radius: 0.25rem;
		font-family: 'Georgia', 'Times New Roman', serif;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.case-sheet-document.case-sheet-compact {
		max-width: none;
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 0;
		background: transparent;
		font-size: 0.9rem;
	}

	.case-sheet-header {
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid color-mix(in oklab, currentColor 18%, transparent);
	}

	.case-sheet-doc-title {
		font-size: 1.35rem;
		font-weight: 700;
		margin: 0 0 0.75rem;
		letter-spacing: 0.02em;
	}

	.case-sheet-meta {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: 0.65rem 1.25rem;
		margin: 0;
		font-size: 0.88rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}

	.case-sheet-meta dt {
		font-weight: 600;
		color: color-mix(in oklab, currentColor 55%, transparent);
		margin: 0;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.case-sheet-meta dd {
		margin: 0.1rem 0 0;
	}

	.case-sheet-section {
		margin-top: 1.35rem;
		break-inside: avoid;
	}

	.case-sheet-section h3 {
		font-size: 1rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
		border-bottom: 1px solid color-mix(in oklab, currentColor 14%, transparent);
		padding-bottom: 0.25rem;
	}

	.case-sheet-list {
		margin: 0.35rem 0 0;
		padding-left: 1.35rem;
	}

	.case-sheet-list li {
		margin-bottom: 0.35rem;
	}

	.case-sheet-empty {
		margin: 0.35rem 0 0;
		font-style: italic;
		color: color-mix(in oklab, currentColor 50%, transparent);
	}

	.case-sheet-audit {
		margin-top: 0.4rem;
		font-size: 0.78rem;
		color: color-mix(in oklab, currentColor 55%, transparent);
		font-family: ui-sans-serif, system-ui, sans-serif;
	}

	.case-sheet-muted {
		color: color-mix(in oklab, currentColor 45%, transparent);
		font-size: 0.92em;
	}

	.case-sheet-table-wrap {
		margin-top: 0.5rem;
		overflow-x: auto;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.82rem;
	}

	.case-sheet-table {
		width: 100%;
		border-collapse: collapse;
	}

	.case-sheet-table th,
	.case-sheet-table td {
		border: 1px solid color-mix(in oklab, currentColor 16%, transparent);
		padding: 0.35rem 0.5rem;
		text-align: left;
		vertical-align: top;
	}

	.case-sheet-table th {
		font-weight: 600;
		background: color-mix(in oklab, currentColor 6%, transparent);
	}

	.case-sheet-footer {
		margin-top: 2rem;
		padding-top: 0.75rem;
		border-top: 1px solid color-mix(in oklab, currentColor 14%, transparent);
		font-size: 0.78rem;
		color: color-mix(in oklab, currentColor 48%, transparent);
		font-family: ui-sans-serif, system-ui, sans-serif;
	}

	@media print {
		.case-sheet-document {
			max-width: none;
			margin: 0;
			padding: 0;
			border: none;
			border-radius: 0;
			box-shadow: none;
			background: #fff;
			color: #111;
			font-size: 11pt;
		}

		.case-sheet-section {
			break-inside: avoid;
		}

		.case-sheet-table th {
			background: #f3f3f3 !important;
			print-color-adjust: exact;
		}
	}
</style>
