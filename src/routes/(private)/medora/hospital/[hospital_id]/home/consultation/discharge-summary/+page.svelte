<script lang="ts">
	import { page } from '$app/state';
	import WashAlert from '$lib/component/wash/alert/WashAlert.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import LucideSave from '$lib/component/own/library/lucide/LucideSave.svelte';
	import LucideSignature from '$lib/component/own/library/lucide/LucideSignature.svelte';
	import { DOCUMENT_PRINT_CODE } from '$lib/model/constant/document-print.constant';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { StaffTypeEnum } from '$lib/model/enum/db-link';
	import type { DischargeSummaryRow } from '$lib/model/type/medora/clinical.type';
	import { m } from '$lib/paraglide/messages';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { VisitState } from '$lib/state/visit.state.svelte';
	import { buildDischargeSummaryPrintBodyHtml } from '$lib/util/discharge-summary-print-body.util';
	import {
		buildPrintHtmlFromDocumentMasterBootstrap,
		fetchDocumentPrintBootstrap,
		printFromDocumentMasterBootstrap
	} from '$lib/util/document-master-print.util.svelte';
	import { persistEmrPrintPdf } from '$lib/util/emr-print-persist.util';
	import {
		htmlStringToPdfBlob,
		uploadPatientAttachmentPdf
	} from '$lib/util/html-to-pdf.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { StringUtil } from '$lib/util/string.util.svelte';
	import type { VisitLike } from '$lib/util/document-placeholder.util';
	import { throwUserFacingHttpError } from '$lib/util/user-facing-error.util';

	const msg = m as Record<string, (inputs?: object) => string>;

	const hospitalId = $derived(page.params.hospital_id ?? '');
	const visitId = $derived(
		Number(
			page.url.searchParams.get('visitId') ?? VisitState.visitId ?? 0
		)
	);

	let summary = $state<DischargeSummaryRow | null>(null);
	let hospitalCourse = $state('');
	let dischargeMedications = $state('');
	let followUp = $state('');
	let redFlags = $state('');
	let visitRow = $state<VisitLike | null>(null);
	let isLoading = $state(false);
	let isSaving = $state(false);
	let isSigning = $state(false);
	let isPrinting = $state(false);
	let mounted = $state(false);

	const lifeCycleUtil = new LifeCycleUtil();
	lifeCycleUtil.onMount(() => {
		mounted = true;
	});
	lifeCycleUtil.onDestroy(() => {
		mounted = false;
	});

	const toastService = new ToastService();

	const isBusy = $derived(isSaving || isSigning || isPrinting);
	const isSigned = $derived(!!summary?.signedAt);

	const staffTypeId = $derived(
		typeof page.data?.staff?.staffTypeId === 'number'
			? page.data.staff.staffTypeId
			: null
	);
	const canSignAsConsultant = $derived(
		staffTypeId === StaffTypeEnum.DOCTOR ||
			staffTypeId === StaffTypeEnum.CONSULTANT
	);

	const printByName = $derived.by(() => {
		const s = page.data?.staff as
			| {
					firstName?: string | null;
					middleName?: string | null;
					lastName?: string | null;
			  }
			| null
			| undefined;
		if (s) {
			const name = [s.firstName, s.middleName, s.lastName]
				.filter((x) => Boolean(x && String(x).trim()))
				.join(' ')
				.trim();
			if (name) return name;
		}
		const u = page.data?.user as
			| { name?: string | null; email?: string | null }
			| null
			| undefined;
		return (u?.name || u?.email || '').trim();
	});

	const patientDisplayName = $derived(
		visitRow?.patient
			? StringUtil.patientDisplayName(visitRow.patient as never)
			: VisitState.patientName || '-'
	);

	function fillForm(row: DischargeSummaryRow | null) {
		summary = row;
		hospitalCourse = row?.hospitalCourse ?? '';
		dischargeMedications = row?.dischargeMedications ?? '';
		followUp = row?.followUp ?? '';
		redFlags = row?.redFlags ?? '';
	}

	function formatText(value: string | null | undefined): string {
		if (value == null || value === '') return '-';
		return String(value);
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '-';
		try {
			return new Date(value).toLocaleString('en-US', {
				dateStyle: 'short',
				timeStyle: 'short'
			});
		} catch {
			return '-';
		}
	}

	async function request(
		method: 'GET' | 'POST',
		body?: Record<string, unknown>
	) {
		const url = `/api/medora/hospital/${hospitalId}/home/consultation/discharge-summary`;
		const response = await fetch(
			method === 'GET' ? `${url}?visitId=${visitId}` : url,
			method === 'POST'
				? {
						method,
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify(body)
					}
				: undefined
		);
		if (!response.ok) await throwUserFacingHttpError(response);
		return (await response.json()) as DischargeSummaryRow | null;
	}

	async function fetchVisitRow(): Promise<VisitLike | null> {
		if (!hospitalId || !visitId) return null;
		try {
			const qs = new URLSearchParams({
				mode: 'visit.bar',
				visitId: String(visitId)
			});
			const res = await fetch(
				`/api/medora/hospital/${encodeURIComponent(hospitalId)}/home/emr/visit-list?${qs}`,
				{ credentials: 'include' }
			);
			if (!res.ok) return null;
			const pack = (await res.json()) as { visit?: VisitLike | null };
			return pack.visit ?? null;
		} catch {
			return null;
		}
	}

	async function loadSummary() {
		if (!hospitalId || !visitId) {
			fillForm(null);
			visitRow = null;
			return;
		}
		isLoading = true;
		try {
			const [row, visit] = await Promise.all([
				request('GET'),
				fetchVisitRow()
			]);
			fillForm(row);
			visitRow = visit;
		} catch (error) {
			console.error(error);
			toastService.addErrorToast(
				m.mo_clinical_discharge_load_failed(),
				error
			);
		} finally {
			isLoading = false;
		}
	}

	function buildPrintOpts(visit: VisitLike | null) {
		const bodyHtml = buildDischargeSummaryPrintBodyHtml({
			labels: {
				hospitalCourse: m.mo_clinical_hospital_course(),
				dischargeMedications: m.mo_clinical_discharge_medications(),
				followUp: m.mo_clinical_follow_up(),
				redFlags: m.mo_clinical_red_flags(),
				empty: msg.mo_clinical_discharge_empty()
			},
			hospitalCourse,
			dischargeMedications,
			followUp,
			redFlags
		});

		const printedAt = new Date().toLocaleString('en-US', {
			dateStyle: 'short',
			timeStyle: 'short'
		});

		return {
			visit,
			printBy: printByName,
			extraPlaceholders: {
				'{{print.body_html}}': bodyHtml,
				'{{print.datetime}}': printedAt,
				'{{print.label_title}}': m.mo_clinical_discharge_title(),
				'{{print.label_visit_no}}':
					m.visit_history_visit_label_visit_no(),
				'{{print.label_patient}}':
					m.visit_history_visit_label_patient(),
				'{{print.label_patient_code}}':
					m.visit_history_visit_label_patient_code(),
				'{{print.label_visit_date}}':
					m.visit_history_visit_label_visit_date(),
				'{{print.label_doctor}}': m.visit_history_visit_label_doctor(),
				'{{print.label_generated}}':
					msg.mo_clinical_discharge_generated()
			},
			iframeId: 'discharge-summary-print-iframe'
		};
	}

	async function attachPdfIfPossible(
		visit: VisitLike | null,
		patientId: string | null | undefined
	): Promise<'attached' | 'skipped' | 'failed'> {
		const pid = patientId ?? visit?.patient?.id ?? null;
		if (!pid || !hospitalId || !visitId) return 'skipped';

		try {
			const bootstrap = await fetchDocumentPrintBootstrap(
				hospitalId,
				DOCUMENT_PRINT_CODE.DISCHARGE_SUMMARY
			);
			if (!bootstrap.document?.documentText) return 'failed';

			const printOpts = buildPrintOpts(visit);
			const htmlPdf = buildPrintHtmlFromDocumentMasterBootstrap(
				bootstrap,
				printOpts,
				'pdfRaster'
			);
			const blob = await htmlStringToPdfBlob(htmlPdf);
			const visitNo =
				(visit as { visitNo?: string | null } | null)?.visitNo ??
				visitId;
			const safeBase =
				`discharge-summary-${visitNo}-${Date.now()}`
					.replace(/[^\w.-]+/g, '_')
					.slice(0, 120);
			const url = await uploadPatientAttachmentPdf(
				blob,
				`${safeBase}.pdf`
			);
			await persistEmrPrintPdf({
				hospitalId,
				patientId: String(pid),
				visitId,
				documentId: bootstrap.document.id,
				fileUrl: url,
				attachmentDescription: `Discharge summary (visit ${visitNo})`
			});
			return 'attached';
		} catch (err) {
			console.error('Discharge summary PDF attach failed', err);
			return 'failed';
		}
	}

	async function saveSummary() {
		if (!hospitalId || !visitId) {
			toastService.addToast(
				m.mo_clinical_select_visit(),
				StatusColorEnum.WARNING
			);
			return;
		}
		if (isSigned) return;

		isSaving = true;
		try {
			const row = await request('POST', {
				visitId,
				hospitalCourse,
				dischargeMedications,
				followUp,
				redFlags
			});
			fillForm(row);

			const visit = visitRow ?? (await fetchVisitRow());
			if (visit) visitRow = visit;

			const attachResult = await attachPdfIfPossible(
				visit,
				row?.patientId
			);
			if (attachResult === 'attached') {
				toastService.addToast(
					msg.mo_clinical_discharge_saved_with_pdf(),
					StatusColorEnum.SUCCESS
				);
			} else if (attachResult === 'failed') {
				toastService.addToast(
					msg.mo_clinical_discharge_save_attachment_failed(),
					StatusColorEnum.WARNING
				);
			} else {
				toastService.addToast(
					m.mo_clinical_discharge_saved(),
					StatusColorEnum.SUCCESS
				);
			}
		} catch (error) {
			console.error(error);
			toastService.addErrorToast(
				m.mo_clinical_discharge_save_failed(),
				error
			);
		} finally {
			isSaving = false;
		}
	}

	async function signSummary() {
		if (!hospitalId || !visitId || !summary || isSigned) return;
		if (!canSignAsConsultant) {
			toastService.addToast(
				msg.mo_clinical_discharge_sign_consultant_required(),
				StatusColorEnum.WARNING
			);
			return;
		}

		isSigning = true;
		try {
			fillForm(await request('POST', { action: 'sign', visitId }));
			toastService.addToast(
				m.mo_clinical_discharge_signed(),
				StatusColorEnum.SUCCESS
			);
		} catch (error) {
			console.error(error);
			toastService.addErrorToast(
				m.mo_clinical_discharge_sign_failed(),
				error
			);
		} finally {
			isSigning = false;
		}
	}

	async function printSummary() {
		if (!hospitalId || !visitId) {
			toastService.addToast(
				m.mo_clinical_select_visit(),
				StatusColorEnum.WARNING
			);
			return;
		}

		isPrinting = true;
		try {
			const visit = visitRow ?? (await fetchVisitRow());
			if (visit) visitRow = visit;

			const bootstrap = await fetchDocumentPrintBootstrap(
				hospitalId,
				DOCUMENT_PRINT_CODE.DISCHARGE_SUMMARY
			);
			if (!bootstrap.document?.documentText) {
				toastService.addToast(
					msg.mo_clinical_discharge_print_failed(),
					StatusColorEnum.ERROR
				);
				return;
			}

			await printFromDocumentMasterBootstrap(
				bootstrap,
				buildPrintOpts(visit)
			);
		} catch (err) {
			console.error('Discharge summary print failed', err);
			toastService.addToast(
				msg.mo_clinical_discharge_print_failed(),
				StatusColorEnum.ERROR
			);
		} finally {
			isPrinting = false;
		}
	}

	const signDisabled = $derived(
		isBusy ||
			!summary ||
			isSigned ||
			!canSignAsConsultant ||
			!hospitalCourse.trim()
	);

	const signTooltip = $derived(
		isSigned
			? m.mo_clinical_signed()
			: !canSignAsConsultant
				? msg.mo_clinical_discharge_sign_consultant_required()
				: !summary
					? msg.mo_clinical_discharge_sign_save_first()
					: !hospitalCourse.trim()
						? msg.mo_clinical_discharge_sign_course_required()
						: m.mo_clinical_sign()
	);

	$effect(() => {
		if (!mounted) return;
		void visitId;
		void hospitalId;
		void loadSummary();
	});
</script>

<svelte:head>
	<title>{m.mo_clinical_discharge_title()}</title>
</svelte:head>

<div class="discharge-summary-root px-2 py-4 md:px-4">
	{#if !visitId}
		<WashAlert
			type={StatusColorEnum.INFO}
			message={m.mo_clinical_select_visit()}
			className="z-0"
		/>
	{:else if isLoading && !summary && !hospitalCourse}
		<div
			class="no-print mb-3 flex items-center gap-2 text-sm text-base-content/70"
			role="status"
			aria-live="polite"
		>
			<span class="loading loading-spinner loading-sm"></span>
			{m.loading()}
		</div>
	{:else}
		<article class="discharge-document">
			<header class="discharge-header">
				<div
					class="discharge-title-row flex items-center justify-between gap-2"
				>
					<div class="flex min-w-0 flex-wrap items-center gap-2">
						<h2 class="discharge-doc-title">
							{m.mo_clinical_discharge_title()}
						</h2>
						{#if isSigned}
							<span class="badge badge-success badge-sm">
								{m.mo_clinical_signed()}
							</span>
						{/if}
					</div>
					<div class="no-print flex shrink-0 items-center gap-1">
						<div
							class="tooltip tooltip-primary tooltip-left"
							data-tip={m.save()}
						>
							<button
								type="button"
								class="btn btn-ghost btn-square btn-primary"
								class:cursor-pointer={!isBusy && !isSigned}
								class:cursor-not-allowed={isBusy || isSigned}
								class:loading={isSaving}
								disabled={isBusy || isSigned}
								aria-busy={isSaving}
								aria-label={m.save()}
								onclick={saveSummary}
							>
								<LucideSave className="size-4" />
							</button>
						</div>
						<div
							class="tooltip tooltip-accent tooltip-left"
							data-tip={signTooltip}
						>
							<button
								type="button"
								class="btn btn-ghost btn-square btn-accent"
								class:cursor-pointer={!signDisabled}
								class:cursor-not-allowed={signDisabled}
								class:loading={isSigning}
								disabled={signDisabled}
								aria-busy={isSigning}
								aria-label={signTooltip}
								onclick={signSummary}
							>
								<LucideSignature className="size-4" />
							</button>
						</div>
						<div
							class="tooltip tooltip-secondary tooltip-left"
							data-tip={msg.mo_clinical_discharge_print()}
						>
							<button
								type="button"
								class="btn btn-ghost btn-square btn-secondary"
								class:cursor-pointer={!isBusy}
								class:cursor-not-allowed={isBusy}
								class:loading={isPrinting}
								disabled={isBusy}
								aria-busy={isPrinting}
								aria-label={msg.mo_clinical_discharge_print()}
								onclick={printSummary}
							>
								<LucidePrinter className="size-4" />
							</button>
						</div>
					</div>
				</div>
				{#if visitRow}
					<dl class="discharge-meta">
						<div>
							<dt>{m.visit_history_visit_label_visit_no()}</dt>
							<dd
								>{formatText(
									(visitRow as { visitNo?: string | null }).visitNo
								)}</dd
							>
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
							<dd
								>{formatDateTime(
									(visitRow as { createdAt?: string | null })
										.createdAt ?? null
								)}</dd
							>
						</div>
					</dl>
				{/if}
			</header>

			<section class="discharge-section">
				<h3>{m.mo_clinical_hospital_course()}</h3>
				<textarea
					class="discharge-notebook cursor-text"
					class:cursor-default={isSigned}
					bind:value={hospitalCourse}
					readonly={isSigned}
					placeholder={msg.mo_clinical_discharge_hint_hospital_course()}
					rows="7"
					aria-label={m.mo_clinical_hospital_course()}
				></textarea>
			</section>

			<section class="discharge-section">
				<h3>{m.mo_clinical_discharge_medications()}</h3>
				<textarea
					class="discharge-notebook cursor-text"
					class:cursor-default={isSigned}
					bind:value={dischargeMedications}
					readonly={isSigned}
					placeholder={msg.mo_clinical_discharge_hint_medications()}
					rows="6"
					aria-label={m.mo_clinical_discharge_medications()}
				></textarea>
			</section>

			<section class="discharge-section">
				<h3>{m.mo_clinical_follow_up()}</h3>
				<textarea
					class="discharge-notebook cursor-text"
					class:cursor-default={isSigned}
					bind:value={followUp}
					readonly={isSigned}
					placeholder={msg.mo_clinical_discharge_hint_follow_up()}
					rows="5"
					aria-label={m.mo_clinical_follow_up()}
				></textarea>
			</section>

			<section class="discharge-section">
				<h3>{m.mo_clinical_red_flags()}</h3>
				<textarea
					class="discharge-notebook cursor-text"
					class:cursor-default={isSigned}
					bind:value={redFlags}
					readonly={isSigned}
					placeholder={msg.mo_clinical_discharge_hint_red_flags()}
					rows="5"
					aria-label={m.mo_clinical_red_flags()}
				></textarea>
			</section>

			<footer class="discharge-footer">
				{msg.mo_clinical_discharge_generated()}:
				{new Date().toLocaleString('en-US', {
					dateStyle: 'short',
					timeStyle: 'short'
				})}
			</footer>
		</article>
	{/if}
</div>

<style>
	.discharge-document {
		max-width: 52rem;
		margin: 0 auto;
		padding: 1.75rem 1.5rem 2rem;
		background: var(--fallback-b1, oklch(var(--b1)));
		color: var(--fallback-bc, oklch(var(--bc)));
		border: 1px solid
			color-mix(in oklab, currentColor 12%, transparent);
		border-radius: 0.25rem;
		font-family: 'Georgia', 'Times New Roman', serif;
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.discharge-header {
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid
			color-mix(in oklab, currentColor 18%, transparent);
	}

	.discharge-title-row {
		margin: 0 0 0.75rem;
	}

	.discharge-doc-title {
		font-size: 1.35rem;
		font-weight: 700;
		margin: 0;
		letter-spacing: 0.02em;
	}

	.discharge-meta {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
		gap: 0.65rem 1.25rem;
		margin: 0;
		font-size: 0.88rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}

	.discharge-meta dt {
		font-weight: 600;
		color: color-mix(in oklab, currentColor 55%, transparent);
		margin: 0;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.discharge-meta dd {
		margin: 0.1rem 0 0;
	}

	.discharge-section {
		margin-top: 1.35rem;
		break-inside: avoid;
	}

	.discharge-section h3 {
		font-size: 1rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
		border-bottom: 1px solid
			color-mix(in oklab, currentColor 14%, transparent);
		padding-bottom: 0.25rem;
	}

	.discharge-notebook {
		display: block;
		width: 100%;
		border: none;
		outline: none;
		resize: vertical;
		background: transparent;
		box-shadow: none;
		font: inherit;
		line-height: 1.65;
		color: inherit;
		padding: 0.2rem 0;
		min-height: 5.5rem;
	}

	.discharge-notebook::placeholder {
		font-style: italic;
		color: color-mix(in oklab, currentColor 42%, transparent);
	}

	.discharge-notebook:read-only {
		opacity: 0.95;
	}

	.discharge-footer {
		margin-top: 2rem;
		padding-top: 0.75rem;
		border-top: 1px solid
			color-mix(in oklab, currentColor 14%, transparent);
		font-size: 0.78rem;
		color: color-mix(in oklab, currentColor 48%, transparent);
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
</style>
