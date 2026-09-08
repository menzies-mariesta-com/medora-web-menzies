<script lang="ts">
	import { page } from '$app/state';
	import WashCard from '$lib/component/wash/card/WashCard.svelte';
	import WashButton from '$lib/component/wash/button/WashButton.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import LucideFileText from '$lib/component/own/library/lucide/LucideFileText.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { DocumentSettingWithRelations } from '$lib/model/type/document-setting.type';
	import type { ClinicalDocumentRow } from '$lib/model/type/medora/document-print.type';
	import {
		buildVisitServiceLinesTableHtml,
		type VisitLike
	} from '$lib/util/document-placeholder.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { buildClinicalFormPrintHtml } from '$lib/util/clinical-form-print.util.svelte';
	import { printHtmlInIframe } from '$lib/util/document-master-print.util.svelte';
	import { persistEmrPrintPdf } from '$lib/util/emr-print-persist.util';
	import {
		htmlStringToPdfBlob,
		uploadPatientAttachmentPdf
	} from '$lib/util/html-to-pdf.util';
	import { fetchVisitServiceLinePrintRows } from '$lib/util/visit-service-lines-print.util';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';
	import { m } from '$lib/paraglide/messages';

	const toastService = new ToastService();
	const lifeCycleUtil = new LifeCycleUtil();

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);
	const hospitalId = $derived(
		typeof page.params.hospital_id === 'string' &&
			page.params.hospital_id
			? page.params.hospital_id
			: ''
	);
	let visit = $state<VisitLike | null>(null);
	let documents = $state<ClinicalDocumentRow[]>([]);
	let documentSettings = $state<DocumentSettingWithRelations[]>([]);
	let isLoading = $state(false);
	let isPrinting = $state(false);
	let savingDocumentId = $state<number | null>(null);
	const printLock = createActionLock();
	let lastLoadedVisitId = $state<number | null>(null);
	let serviceLinesTableHtml = $state('');

	const printByName = $derived(
		typeof page.data?.printByName === 'string'
			? page.data.printByName
			: ''
	);

	const consentDocuments = $derived(
		documents.filter(
			(d) => d.documentType?.documentType?.toLowerCase() === 'consent'
		)
	);
	const instructionDocuments = $derived(
		documents.filter(
			(d) =>
				d.documentType?.documentType?.toLowerCase() === 'instruction'
		)
	);
	const formDocuments = $derived(
		documents.filter((d) => {
			const type = d.documentType?.documentType?.toLowerCase() ?? '';
			return type === 'form' || type === 'certificate';
		})
	);

	const canAct = $derived(
		!isPrinting &&
			savingDocumentId == null &&
			!!visitId &&
			visit !== null
	);

	async function fetchAllData() {
		isLoading = true;
		try {
			const res = await fetch(
				`/api/medora/hospital/${hospitalId}/home/nursing-workbench/emr/clinical-document?mode=bootstrap&visitId=${visitId}`
			);
			if (!res.ok) throw new Error(`Failed to load (${res.status})`);
			const payload = (await res.json()) as {
				visit?: VisitLike | null;
				documents?: ClinicalDocumentRow[];
				documentSettings?: DocumentSettingWithRelations[];
			};

			if (visitId) visit = payload.visit ?? null;
			documents = Array.isArray(payload.documents)
				? payload.documents
				: [];
			documentSettings = Array.isArray(payload.documentSettings)
				? payload.documentSettings
				: [];

			if (visitId && payload.visit?.hospitalId) {
				const printRows = await fetchVisitServiceLinePrintRows({
					visitId,
					hospitalId: payload.visit.hospitalId
				});
				serviceLinesTableHtml =
					buildVisitServiceLinesTableHtml(printRows);
			} else {
				serviceLinesTableHtml = '';
			}
		} catch (err) {
			console.error('Failed to fetch data', err);
		} finally {
			isLoading = false;
		}
	}

	let mounted = $state(false);

	lifeCycleUtil.onMount(() => {
		mounted = true;
		fetchAllData();
	});

	$effect(() => {
		if (!mounted) return;

		if (visitId !== lastLoadedVisitId) {
			lastLoadedVisitId = visitId;
			fetchAllData();
		}
	});

	lifeCycleUtil.onDestroy(() => {
		mounted = false;
	});

	function buildPrintHtml(
		doc: ClinicalDocumentRow,
		variant: 'browser' | 'pdfRaster' = 'browser'
	) {
		return buildClinicalFormPrintHtml({
			doc,
			visit,
			documentSettings,
			printBy: printByName,
			serviceLinesTableHtml,
			variant
		});
	}

	async function printDocument(doc: ClinicalDocumentRow) {
		if (visitId && !visit) {
			toastService.addToast(
				'Visit data not loaded yet. Please wait.',
				StatusColorEnum.ERROR
			);
			return;
		}
		await printLock.run(async () => {
			isPrinting = true;
			try {
				const htmlBrowser = buildPrintHtml(doc, 'browser');
				await printHtmlInIframe(htmlBrowser, {
					iframeId: 'clinical-document-print-iframe'
				});
			} catch (err) {
				console.error('Print failed', err);
				toastService.addToast(
					'Failed to prepare document for print',
					StatusColorEnum.ERROR
				);
			} finally {
				isPrinting = false;
			}
		});
	}

	async function saveDocument(doc: ClinicalDocumentRow) {
		if (!visitId || !visit || !hospitalId) {
			toastService.addToast(
				'Select a visit to save.',
				StatusColorEnum.WARNING
			);
			return;
		}

		const patientId = visit.patient?.id;
		if (!patientId) {
			toastService.addToast(
				'Patient data missing.',
				StatusColorEnum.ERROR
			);
			return;
		}

		savingDocumentId = doc.id;
		try {
			const htmlPdf = buildPrintHtml(doc, 'pdfRaster');
			const blob = await htmlStringToPdfBlob(htmlPdf);
			const label =
				doc.documentNumber?.replace(/[^\w.-]+/g, '_').slice(0, 60) ||
				`clinical-form-${doc.id}`;
			const safeBase =
				`${label}-${visit.visitNo || visitId}-${Date.now()}`
					.replace(/[^\w.-]+/g, '_')
					.slice(0, 120);
			const url = await uploadPatientAttachmentPdf(
				blob,
				`${safeBase}.pdf`
			);
			await persistEmrPrintPdf({
				hospitalId,
				patientId,
				visitId,
				documentId: doc.id,
				fileUrl: url,
				attachmentDescription: `${doc.documentNumber ?? 'Clinical form'} (visit ${visit.visitNo ?? visitId})`
			});
			toastService.addToast(
				m.clinical_document_save_success(),
				StatusColorEnum.SUCCESS
			);
		} catch (err) {
			console.error('Clinical form save failed', err);
			toastService.addToast(
				m.clinical_document_save_failed(),
				StatusColorEnum.ERROR
			);
		} finally {
			savingDocumentId = null;
		}
	}

	function isSavingDoc(doc: ClinicalDocumentRow): boolean {
		return savingDocumentId === doc.id;
	}
</script>

{#snippet documentActions(doc: ClinicalDocumentRow, accentClass: string)}
	<div class="flex shrink-0 items-center gap-1">
		<WashButton
			type="button"
			className="btn-outline btn-xs {accentClass}"
			onClick={() => saveDocument(doc)}
			disabled={!canAct}
			loading={isSavingDoc(doc)}
		>
			{m.save()}
		</WashButton>
		<button
			type="button"
			class="btn btn-ghost btn-xs {accentClass}"
			onclick={() => printDocument(doc)}
			title={m.nursing_case_sheet_print()}
			disabled={!canAct}
		>
			<LucidePrinter className="w-4 h-4" />
		</button>
	</div>
{/snippet}

<div class="relative flex flex-col gap-4 p-4">
	{#if isPrinting}
		<div
			class="print-loading-overlay"
			role="status"
			aria-live="polite"
			aria-label="Preparing print"
		>
			<div class="flex flex-col items-center gap-4">
				<span class="loading loading-spinner loading-lg text-primary"></span>
				<span class="text-sm font-medium">Preparing print…</span>
			</div>
		</div>
	{/if}
	{#if !visitId}
		<WashCard className="p-6">
			<div class="text-center text-base-content/70">
				<LucideFileText
					className="w-12 h-12 mx-auto mb-4 opacity-50"
				/>
				<p>
					Please select a patient visit to view clinical documents.
				</p>
			</div>
		</WashCard>
	{:else}
		<div
			class="grid grid-cols-1 gap-4 lg:grid-cols-3"
			class:opacity-60={isLoading}
			class:pointer-events-none={isLoading}
			aria-busy={isLoading}
		>
			{#if isLoading}
				<div
					class="no-print flex items-center gap-2 text-sm text-base-content/70 lg:col-span-3"
				>
					<span class="loading loading-spinner loading-sm"></span>
					Loading documents…
				</div>
			{/if}
			<WashCard className="bg-base-100">
				<div class="border-b border-base-300 p-4">
					<h3 class="flex items-center gap-2 text-lg font-semibold">
						<LucideFileText className="w-5 h-5 text-primary" />
						Consent Forms
					</h3>
					<p class="mt-1 text-sm text-base-content/60">
						{consentDocuments.length} document{consentDocuments.length !==
						1
							? 's'
							: ''} available
					</p>
				</div>
				<ul class="menu p-2">
					{#if consentDocuments.length === 0}
						<li class="d-disabled">
							<span class="text-sm text-base-content/50"
								>No consent forms available</span
							>
						</li>
					{:else}
						{#each consentDocuments as doc (doc.id)}
							<li>
								<div
									class="flex w-full items-center justify-between gap-2 py-2"
								>
									<span class="min-w-0 flex-1 truncate text-sm">
										{doc.documentNumber || `Consent #${doc.id}`}
									</span>
									{@render documentActions(doc, 'text-primary')}
								</div>
							</li>
						{/each}
					{/if}
				</ul>
			</WashCard>

			<WashCard className="bg-base-100">
				<div class="border-b border-base-300 p-4">
					<h3 class="flex items-center gap-2 text-lg font-semibold">
						<LucideFileText className="w-5 h-5 text-info" />
						Instruction Forms
					</h3>
					<p class="mt-1 text-sm text-base-content/60">
						{instructionDocuments.length} document{instructionDocuments.length !==
						1
							? 's'
							: ''} available
					</p>
				</div>
				<ul class="menu p-2">
					{#if instructionDocuments.length === 0}
						<li class="d-disabled">
							<span class="text-sm text-base-content/50"
								>No instruction forms available</span
							>
						</li>
					{:else}
						{#each instructionDocuments as doc (doc.id)}
							<li>
								<div
									class="flex w-full items-center justify-between gap-2 py-2"
								>
									<span class="min-w-0 flex-1 truncate text-sm">
										{doc.documentNumber ||
											`Instruction #${doc.id}`}
									</span>
									{@render documentActions(doc, 'text-info')}
								</div>
							</li>
						{/each}
					{/if}
				</ul>
			</WashCard>

			<WashCard className="bg-base-100">
				<div class="border-b border-base-300 p-4">
					<h3 class="flex items-center gap-2 text-lg font-semibold">
						<LucideFileText className="w-5 h-5 text-success" />
						Forms
					</h3>
					<p class="mt-1 text-sm text-base-content/60">
						{formDocuments.length} document{formDocuments.length !== 1
							? 's'
							: ''} available
					</p>
				</div>
				<ul class="menu p-2">
					{#if formDocuments.length === 0}
						<li class="d-disabled">
							<span class="text-sm text-base-content/50"
								>No forms available</span
							>
						</li>
					{:else}
						{#each formDocuments as doc (doc.id)}
							<li>
								<div
									class="flex w-full items-center justify-between gap-2 py-2"
								>
									<span class="min-w-0 flex-1 truncate text-sm">
										{doc.documentNumber || `Form #${doc.id}`}
									</span>
									{@render documentActions(doc, 'text-success')}
								</div>
							</li>
						{/each}
					{/if}
				</ul>
			</WashCard>
		</div>
	{/if}
</div>

<style>
	.print-loading-overlay {
		position: fixed;
		inset: 0;
		z-index: 9990;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(2px);
	}
</style>
