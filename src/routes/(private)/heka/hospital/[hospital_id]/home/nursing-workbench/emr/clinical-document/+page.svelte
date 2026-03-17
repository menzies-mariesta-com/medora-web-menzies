<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import LucidePrinter from '$lib/component/library/lucide/LucidePrinter.svelte';
	import LucideFileText from '$lib/component/library/lucide/LucideFileText.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import LucideChevronRight from '$lib/component/library/lucide/LucideChevronRight.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import {
		getPatientVisitByIdWithRelations
	} from '$lib/remote/table/information-table/patient-visit.remote';
	import {
		getDocumentsWithRelations,
		type DocumentWithRelations
	} from '$lib/remote/table/information-table/document.remote';
	import { getDocumentTypes } from '$lib/remote/table/information-table/document-type.remote';
	import {
		getDocumentSettingsWithRelations,
		type DocumentSettingWithRelations
	} from '$lib/remote/table/information-table/document-setting.remote';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import type {
		DocumentTypeSchema,
		DocumentSettingSchema
	} from '$lib/server/db/schema-type';
	import type { PatientVisitWithRelations } from '$lib/remote/table/information-table/patient-visit.remote';
import {
	buildDocumentPlaceholderContext,
	resolveDocumentTemplate
} from '$lib/util/document-placeholder.util';

	const toastService = new ToastService();

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);
	const hospitalId = $derived(page.params.hospital_id ?? '');

	let visit = $state<PatientVisitWithRelations | null>(null);
	let documents = $state<DocumentWithRelations[]>([]);
	let documentTypes = $state<DocumentTypeSchema[]>([]);
	let documentSettings = $state<DocumentSettingWithRelations[]>([]);
	let isLoading = $state(false);
	let isPrinting = $state(false);
	let selectedDocument = $state<DocumentWithRelations | null>(null);
	let showPreview = $state(false);

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
			const [visitResult, docsResult, typesResult, settingsResult] =
				await Promise.all([
					visitId
						? getPatientVisitByIdWithRelations({ id: visitId })
						: Promise.resolve(null),
					getDocumentsWithRelations(),
					getDocumentTypes(),
					getDocumentSettingsWithRelations()
				]);
			if (visitId) visit = visitResult;
			documents = docsResult;
			documentTypes = typesResult;
			documentSettings = settingsResult;
		} catch (err) {
			console.error('Failed to fetch data', err);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		// Fetch all data on mount and when visitId changes
		fetchAllData();
	});

	function viewDocument(doc: DocumentWithRelations) {
		selectedDocument = doc;
		showPreview = true;
	}

	function closePreview() {
		showPreview = false;
		selectedDocument = null;
	}

	function buildPlaceholderContext(doc: DocumentWithRelations) {
		return buildDocumentPlaceholderContext(visit, doc, {
			printBy: ''
		});
	}

	function applyPlaceholders(
		template: string | null | undefined,
		context: Record<string, string>
	): string {
		return resolveDocumentTemplate(template, context);
	}

	function getResolvedDocumentHtml(doc: DocumentWithRelations): string {
		const context = buildPlaceholderContext(doc);
		return applyPlaceholders(doc.documentText, context).trim();
	}

	async function printDocument(doc: DocumentWithRelations) {
		if (visitId && !visit) {
			toastService.addToast(
				'Visit data not loaded yet. Please wait.',
				StatusColorEnum.ERROR
			);
			return;
		}

		isPrinting = true;
		try {
			// Use hidden iframe so print dialog pops up on top without opening new tab
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

			// Use pre-loaded document settings (no async fetch needed)
			const docTypeName =
				doc.documentType?.documentType?.trim().toLowerCase() ?? '';
			const setting: DocumentSettingSchema | null = doc.documentSettingId
				? (documentSettings.find(
						(s) => s.id === doc.documentSettingId
					) as DocumentSettingSchema | null) ??
					null
				: doc.documentTypeId
					? (documentSettings.find(
							(s) => s.documentTypeId === doc.documentTypeId
						) as DocumentSettingSchema | null) ??
						(documentSettings.find(
							(s) =>
								(s.documentType?.documentType ?? '')
									.trim()
									.toLowerCase() === docTypeName
						) as DocumentSettingSchema | null) ??
						(documentSettings.find((s) => {
							const name = (s.name ?? '').trim().toLowerCase();
							return (
								Boolean(docTypeName) && name.includes(docTypeName)
							);
						}) as DocumentSettingSchema | null) ??
						(documentSettings.length === 1
							? (documentSettings[0] as DocumentSettingSchema)
							: null)
					: null;

			const context = buildPlaceholderContext(doc);
			const documentHtml = applyPlaceholders(doc.documentText, context).trim();
			const marginTop = setting?.marginTop ?? 20;
			const marginBottom = setting?.marginBottom ?? 20;
			const marginLeft = setting?.marginLeft ?? 15;
			const marginRight = setting?.marginRight ?? 15;
			const paddingTop = setting?.paddingTop ?? 10;
			const paddingBottom = setting?.paddingBottom ?? 10;
			const paddingLeft = setting?.paddingLeft ?? 10;
			const paddingRight = setting?.paddingRight ?? 10;
			const pageSize = setting?.pageSize ?? 'A4';
			const orientation = setting?.pageOrientation ?? 'portrait';
			const showHeader = setting?.showHeader ?? true;
			const showFooter = setting?.showFooter ?? true;
			const headerHtml = applyPlaceholders(setting?.headerHtml, context).trim();
			const footerHtml = applyPlaceholders(setting?.footerHtml, context).trim();

			const documentTitle =
				doc.documentNumber ||
				doc.documentType?.documentType ||
				'Document';

			// Header block: header table + document name underneath
			const headerBlock =
				showHeader && headerHtml
					? `<div class="print-header">
						<div class="header-table">${headerHtml}</div>
						<div class="document-name">${documentTitle}</div>
					</div>`
					: showHeader
						? `<div class="print-header"><div class="document-name">${documentTitle}</div></div>`
						: '';

			const footerBlock =
				showFooter && footerHtml
					? `<div class="print-footer">${footerHtml}</div>`
					: '';

			// Reserve space in @page so content area avoids header/footer on every page
			const headerSpaceMm = showHeader ? 38 : 0;
			const footerSpaceMm = showFooter ? 22 : 0;
			const pageMarginTop = marginTop + headerSpaceMm;
			const pageMarginBottom = marginBottom + footerSpaceMm;
			const headerSpacerHeight = showHeader ? 130 : 0;
			const footerSpacerHeight = showFooter ? 70 : 0;

			printWindow.document.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>${documentTitle}</title>
				<style>
					body {
						font-family: 'Roboto', Arial, sans-serif;
						margin: 0;
						padding: ${paddingTop}mm ${paddingRight}mm ${paddingBottom}mm ${paddingLeft}mm;
						line-height: 1.6;
					}
					.header-spacer {
						height: ${headerSpacerHeight}px;
					}
					.footer-spacer {
						height: ${footerSpacerHeight}px;
					}
					.print-header {
						text-align: center;
						padding: 12px 0 10px 0;
						border-bottom: 1px solid #ccc;
					}
					.header-table {
						margin-bottom: 6px;
					}
					.document-name {
						font-weight: 600;
						font-size: 14px;
					}
					.content {
						margin: 0;
					}
					.print-footer {
						text-align: center;
						font-size: 10px;
						padding: 10px 0 12px 0;
					}
					table {
						width: 100%;
						border-collapse: collapse;
					}
					th,
					td {
						border: 1px solid #000;
						padding: 4px 6px;
						text-align: left;
						vertical-align: top;
					}
					thead th {
						background-color: #f5f5f5;
						font-weight: 600;
					}
					@media print {
						@page {
							size: ${pageSize} ${orientation};
							margin: ${pageMarginTop}mm ${marginRight}mm ${pageMarginBottom}mm ${marginLeft}mm;
						}
						.print-header {
							position: fixed;
							top: 0;
							left: 0;
							right: 0;
							padding: 8mm ${marginRight}mm 10px ${marginLeft}mm;
						}
						.print-footer {
							position: fixed;
							bottom: 0;
							left: 0;
							right: 0;
							padding: 10px ${marginRight}mm 8mm ${marginLeft}mm;
						}
					}
				</style>
			</head>
			<body>
				${headerBlock}
				${showHeader ? '<div class="header-spacer"></div>' : ''}
				<div class="content">
					${documentHtml || '<p>No content</p>'}
				</div>
				${showFooter ? '<div class="footer-spacer"></div>' : ''}
				${footerBlock}
			</body>
			</html>
		`);
			printWindow.document.close();
			// Wait for iframe to render before opening print dialog
			await new Promise((resolve) => setTimeout(resolve, 150));
			printWindow.print();
		} catch (err) {
			console.error('Print failed', err);
			toastService.addToast(
				'Failed to prepare document for print',
				StatusColorEnum.ERROR
			);
		} finally {
			isPrinting = false;
		}
	}
</script>

<div class="flex flex-col gap-4 p-4 relative">
	{#if isPrinting}
		<div
			class="print-loading-overlay"
			role="status"
			aria-live="polite"
			aria-label="Preparing document for print"
		>
			<div class="flex flex-col items-center gap-4">
				<DaisyUiLoading className="d-loading-lg text-primary" />
				<span class="text-sm font-medium">Preparing document for print...</span>
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
	{:else if isLoading}
		<div class="flex items-center justify-center py-12">
			<DaisyUiLoading className="d-loading-lg" />
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
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
											class="d-btn d-btn-ghost d-btn-xs"
											onclick={() => viewDocument(doc)}
											title="View"
										>
											<LucideEye className="w-4 h-4" />
										</button>
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
											class="d-btn d-btn-ghost d-btn-xs"
											onclick={() => viewDocument(doc)}
											title="View"
										>
											<LucideEye className="w-4 h-4" />
										</button>
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
											class="d-btn d-btn-ghost d-btn-xs"
											onclick={() => viewDocument(doc)}
											title="View"
										>
											<LucideEye className="w-4 h-4" />
										</button>
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
