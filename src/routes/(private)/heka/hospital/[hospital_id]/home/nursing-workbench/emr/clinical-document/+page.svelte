<script lang="ts">
	import { page } from '$app/state';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import LucidePrinter from '$lib/component/library/lucide/LucidePrinter.svelte';
	import LucideFileText from '$lib/component/library/lucide/LucideFileText.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import LucideChevronRight from '$lib/component/library/lucide/LucideChevronRight.svelte';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
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
		getDocumentSettingById,
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

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	const visitIdStr = $derived(
		page.url.searchParams.get('visitId') ?? ''
	);
	const visitId = $derived(visitIdStr ? Number(visitIdStr) : 0);
	const hospitalId = $derived(page.params.hospital_id ?? '');

	let visit = $state<PatientVisitWithRelations | null>(null);
	let documents = $state<DocumentWithRelations[]>([]);
	let documentTypes = $state<DocumentTypeSchema[]>([]);
	let isLoading = $state(false);
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

	async function fetchVisit() {
		if (!visitId) return;
		try {
			visit = await getPatientVisitByIdWithRelations({ id: visitId });
		} catch (err) {
			console.error('Failed to fetch visit', err);
		}
	}

	async function fetchDocuments() {
		isLoading = true;
		try {
			documents = await getDocumentsWithRelations();
			documentTypes = await getDocumentTypes();
		} catch (err) {
			console.error('Failed to fetch documents', err);
		} finally {
			isLoading = false;
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchVisit();
		fetchDocuments();
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
		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			toastService.addToast(
				'Failed to open print window',
				StatusColorEnum.ERROR
			);
			return;
		}

		let setting: DocumentSettingSchema | null = null;
		try {
			if (doc.documentSettingId) {
				setting = await getDocumentSettingById({
					id: doc.documentSettingId
				});
			} else if (doc.documentTypeId) {
				// Fallback: find a setting by type/name, then single-item fallback.
				const allSettings: DocumentSettingWithRelations[] =
					await getDocumentSettingsWithRelations();
				const docTypeName =
					doc.documentType?.documentType?.trim().toLowerCase() ?? '';
				const matchedByTypeId =
					allSettings.find((s) => s.documentTypeId === doc.documentTypeId) ??
					null;
				const matchedByTypeName =
					allSettings.find(
						(s) =>
							(s.documentType?.documentType ?? '')
								.trim()
								.toLowerCase() === docTypeName
					) ?? null;
				const matchedByNameOrCode =
					allSettings.find((s) => {
						const name = (s.name ?? '').trim().toLowerCase();
						return (
							Boolean(docTypeName) &&
							name.includes(docTypeName)
						);
					}) ?? null;
				const singleSetting =
					allSettings.length === 1 ? allSettings[0] : null;

				setting =
					matchedByTypeId ??
					matchedByTypeName ??
					matchedByNameOrCode ??
					singleSetting;
			}
		} catch (err) {
			console.error('Failed to load document setting', err);
		}

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

		printWindow.document.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>${documentTitle}</title>
				<style>
					body {
						font-family: 'Roboto', Arial, sans-serif;
						margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
						padding: ${paddingTop}mm ${paddingRight}mm ${paddingBottom}mm ${paddingLeft}mm;
						line-height: 1.6;
					}
					.header {
						text-align: center;
						margin-bottom: 20px;
						padding-bottom: 10px;
						border-bottom: 1px solid #ccc;
					}
					.content {
						margin-top: 20px;
					}
					.footer {
						margin-top: 40px;
						text-align: center;
						font-size: 10px;
						color: #666;
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
							margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
						}
					}
				</style>
			</head>
			<body>
				${
					showHeader && headerHtml
						? `<div class="header">${headerHtml}</div>`
						: ''
				}
				<div class="content">
					${documentHtml || '<p>No content</p>'}
				</div>
				${
					showFooter && footerHtml
						? `<div class="footer">${footerHtml}</div>`
						: ''
				}
			</body>
			</html>
		`);
		printWindow.document.close();
		printWindow.print();
	}
</script>

<div class="flex flex-col gap-4 p-4">
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
