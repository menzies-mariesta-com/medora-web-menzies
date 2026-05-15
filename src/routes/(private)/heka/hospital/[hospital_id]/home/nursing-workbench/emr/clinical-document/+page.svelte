<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import LucidePrinter from '$lib/component/own/library/lucide/LucidePrinter.svelte';
	import LucideFileText from '$lib/component/own/library/lucide/LucideFileText.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type { DocumentSettingWithRelations } from '$lib/model/type/document-setting.type';
	import type { ClinicalDocumentRow } from '$lib/model/type/heka/document-print.type';
	import {
		buildDocumentPlaceholderContext,
		buildVisitServiceLinesTableHtml,
		resolveDocumentTemplate,
		type VisitLike
	} from '$lib/util/document-placeholder.util';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { buildPrintDocumentHtml } from '$lib/util/print-document-html.util';
	import {
		htmlStringToPdfBlob,
		uploadPatientAttachmentPdf
	} from '$lib/util/html-to-pdf.util';
	import { persistEmrPrintPdf } from '$lib/util/emr-print-persist.util';
	import { resolveDocumentSettingForDoc } from '$lib/util/emr-print-setting.util';
	import { fetchVisitServiceLinePrintRows } from '$lib/util/visit-service-lines-print.util';
	import { StatusEnum } from '$lib/model/enum/db-link';
	import { createActionLock } from '$lib/util/action-lock.util.svelte';

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
	const printLock = createActionLock();
	let selectedDocument = $state<ClinicalDocumentRow | null>(null);
	let showPreview = $state(false);
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
		documents.filter(
			(d) => d.documentType?.documentType?.toLowerCase() === 'form'
		)
	);

	/** Print is ready when visit is loaded (or no visitId) and not currently printing */
	const canPrint = $derived(
		!isPrinting && (!visitId || visit !== null)
	);

	async function fetchAllData() {
		isLoading = true;
		try {
			const res = await fetch(
				`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/clinical-document?mode=bootstrap&visitId=${visitId}`
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

	function closePreview() {
		showPreview = false;
		selectedDocument = null;
	}

	function buildPlaceholderContext(doc: ClinicalDocumentRow) {
		return buildDocumentPlaceholderContext(visit, doc, {
			printBy: printByName,
			extraPlaceholders: {
				'{{visit.service_lines_table}}': serviceLinesTableHtml
			}
		});
	}

	function applyPlaceholders(
		template: string | null | undefined,
		context: Record<string, string>
	): string {
		return resolveDocumentTemplate(template, context);
	}

	function getResolvedDocumentHtml(doc: ClinicalDocumentRow): string {
		const context = buildPlaceholderContext(doc);
		return applyPlaceholders(doc.documentText, context).trim();
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
				let iframe = document.getElementById(
					'clinical-document-print-iframe'
				) as HTMLIFrameElement | null;
				if (!iframe) {
					iframe = document.createElement('iframe');
					iframe.id = 'clinical-document-print-iframe';
					iframe.style.cssText =
						'position:absolute;width:0;height:0;border:0;visibility:hidden;';
					document.body.appendChild(iframe);
				}
				const printWindow = iframe.contentWindow;
				if (!printWindow) {
					toastService.addToast(
						'Failed to prepare print',
						StatusColorEnum.ERROR
					);
					return;
				}

				const setting = resolveDocumentSettingForDoc(
					documentSettings,
					doc
				);

				const context = buildPlaceholderContext(doc);
				const documentHtml = applyPlaceholders(
					doc.documentText,
					context
				).trim();
				const headerHtml = applyPlaceholders(
					setting?.headerHtml,
					context
				).trim();
				const footerHtml = applyPlaceholders(
					setting?.footerHtml,
					context
				).trim();

				const documentTitle =
					doc.documentNumber ||
					doc.documentType?.documentType ||
					'Document';

				const htmlBrowser = buildPrintDocumentHtml({
					documentHtml,
					documentTitle,
					headerHtml,
					footerHtml,
					setting,
					variant: 'browser'
				});

				const htmlPdf = buildPrintDocumentHtml({
					documentHtml,
					documentTitle,
					headerHtml,
					footerHtml,
					setting,
					variant: 'pdfRaster'
				});

				printWindow.document.open();
				printWindow.document.write(htmlBrowser);
				printWindow.document.close();
				await new Promise((resolve) => setTimeout(resolve, 150));
				printWindow.print();

				const patientId = visit?.patient?.id;
				if (visitId && patientId) {
					try {
						const blob = await htmlStringToPdfBlob(htmlPdf);
						const safeBase =
							`${doc.documentNumber || `doc-${doc.id}`}-${visit?.visitNo || visitId}-${Date.now()}`
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
							attachmentDescription: `Printed: ${documentTitle} (visit ${visit?.visitNo ?? visitId})`
						});
						toastService.addToast(
							'Saved to patient documents (PDF attached).',
							StatusColorEnum.SUCCESS
						);
					} catch (saveErr) {
						console.error('Print PDF save failed', saveErr);
						try {
							const tagRes = await fetch(
								`/api/heka/hospital/${hospitalId}/home/nursing-workbench/emr/clinical-document`,
								{
									method: 'POST',
									headers: { 'content-type': 'application/json' },
									body: JSON.stringify({
										mode: 'patientDocument.create',
										payload: {
											visitId,
											patientId,
											documentId: doc.id,
											statusId: StatusEnum.ACTIVE
										}
									})
								}
							);
							if (!tagRes.ok)
								throw new Error(`Tag failed (${tagRes.status})`);
							toastService.addToast(
								'Saved to patient documents (PDF upload failed).',
								StatusColorEnum.WARNING
							);
						} catch (tagErr) {
							console.error('patient_document insert failed', tagErr);
							toastService.addToast(
								'Printed, but saving to patient documents failed.',
								StatusColorEnum.ERROR
							);
						}
					}
				}
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
</script>

<div class="relative flex flex-col gap-4 p-4">
	{#if isPrinting}
		<div
			class="print-loading-overlay"
			role="status"
			aria-live="polite"
			aria-label="Preparing print and PDF save"
		>
			<div class="flex flex-col items-center gap-4">
				<DaisyUiLoading className="d-loading-lg text-primary" />
				<span class="text-sm font-medium"
					>Preparing print and PDF…</span
				>
			</div>
		</div>
	{/if}
	{#if !visitId}
		<DaisyUiCard className="p-6">
			<div class="text-center text-base-content/70">
				<LucideFileText
					className="w-12 h-12 mx-auto mb-4 opacity-50"
				/>
				<p>
					Please select a patient visit to view clinical documents.
				</p>
			</div>
		</DaisyUiCard>
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
					<DaisyUiLoading className="d-loading-sm" />
					Loading documents…
				</div>
			{/if}
			<!-- Consent Forms -->
			<DaisyUiCard className="bg-base-100">
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
				<ul class="d-menu p-2">
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
									class="flex w-full items-center justify-between py-2"
								>
									<span class="flex-1 truncate text-sm">
										{doc.documentNumber || `Consent #${doc.id}`}
									</span>
									<div class="flex items-center gap-1">
										<button
											type="button"
											class="d-btn text-primary d-btn-ghost d-btn-xs"
											onclick={() => printDocument(doc)}
											title="Print"
											disabled={!canPrint}
										>
											<LucidePrinter className="w-4 h-4" />
										</button>
									</div>
								</div>
							</li>
						{/each}
					{/if}
				</ul>
			</DaisyUiCard>

			<!-- Instruction Forms -->
			<DaisyUiCard className="bg-base-100">
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
				<ul class="d-menu p-2">
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
									class="flex w-full items-center justify-between py-2"
								>
									<span class="flex-1 truncate text-sm">
										{doc.documentNumber || `Instruction #${doc.id}`}
									</span>
									<div class="flex items-center gap-1">
										<button
											type="button"
											class="d-btn text-info d-btn-ghost d-btn-xs"
											onclick={() => printDocument(doc)}
											title="Print"
											disabled={!canPrint}
										>
											<LucidePrinter className="w-4 h-4" />
										</button>
									</div>
								</div>
							</li>
						{/each}
					{/if}
				</ul>
			</DaisyUiCard>

			<!-- Forms -->
			<DaisyUiCard className="bg-base-100">
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
				<ul class="d-menu p-2">
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
									class="flex w-full items-center justify-between py-2"
								>
									<span class="flex-1 truncate text-sm">
										{doc.documentNumber || `Form #${doc.id}`}
									</span>
									<div class="flex items-center gap-1">
										<button
											type="button"
											class="d-btn text-success d-btn-ghost d-btn-xs"
											onclick={() => printDocument(doc)}
											title="Print"
											disabled={!canPrint}
										>
											<LucidePrinter className="w-4 h-4" />
										</button>
									</div>
								</div>
							</li>
						{/each}
					{/if}
				</ul>
			</DaisyUiCard>
		</div>
	{/if}
</div>

<!-- Document Preview Modal -->
{#if showPreview && selectedDocument}
	<div class="d-modal-open d-modal" role="dialog" aria-modal="true">
		<div class="d-modal-box max-h-[90vh] w-[95vw] max-w-4xl">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-bold">
					{selectedDocument.documentNumber ||
						selectedDocument.documentType?.documentType ||
						'Document Preview'}
				</h3>
				<div class="flex items-center gap-2">
					<DaisyUiButton
						className="d-btn-primary d-btn-sm"
						onClick={() => printDocument(selectedDocument!)}
						disabled={!canPrint}
						loading={printLock.pending}
					>
						<LucidePrinter className="w-4 h-4 mr-1" />
						Print
					</DaisyUiButton>
					<button
						type="button"
						class="d-btn d-btn-circle d-btn-ghost d-btn-sm"
						onclick={closePreview}
					>
						✕
					</button>
				</div>
			</div>
			<div
				class="max-h-[60vh] overflow-y-auto rounded-lg border bg-base-200 p-4"
			>
				<div class="document-preview-content max-w-none">
					{@html getResolvedDocumentHtml(selectedDocument) ||
						'<p class="text-base-content/50">No content</p>'}
				</div>
			</div>
			<div class="d-modal-action">
				<DaisyUiButton className="d-btn-ghost" onClick={closePreview}
					>Close</DaisyUiButton
				>
			</div>
		</div>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="d-modal-backdrop"
			role="button"
			tabindex="0"
			onclick={closePreview}
		></div>
	</div>
{/if}

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

	:global(.document-preview-content table) {
		width: 100%;
		border-collapse: collapse;
	}

	:global(.document-preview-content th),
	:global(.document-preview-content td) {
		border: 1px solid #000;
		padding: 4px 6px;
		vertical-align: top;
		text-align: left;
	}

	:global(.document-preview-content thead th) {
		background-color: #f5f5f5;
		font-weight: 600;
	}
</style>
