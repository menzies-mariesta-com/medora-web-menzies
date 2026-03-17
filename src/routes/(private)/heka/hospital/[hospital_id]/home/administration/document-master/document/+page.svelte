<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/library/daisyui/card/body/DaisyUiCardBody.svelte';
	import DaisyUiSelect from '$lib/component/library/daisyui/select/DaisyUiSelect.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import LucideX from '$lib/component/library/lucide/LucideX.svelte';
	import LucideEye from '$lib/component/library/lucide/LucideEye.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import MariRichEditor from '$lib/component/library/mari/text-editor/rich-editor/MariRichEditor.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { m } from '$lib/paraglide/messages';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import {
		getDocumentsPaginatedWithRelations,
		createDocument,
		updateDocument,
		deleteDocument,
		type DocumentWithRelations
	} from '$lib/remote/table/information-table/document.remote';
	import { getDocumentTypes } from '$lib/remote/table/information-table/document-type.remote';
	import {
		getDocumentSettingsWithRelations,
		type DocumentSettingWithRelations
	} from '$lib/remote/table/information-table/document-setting.remote';
	import type { DocumentTypeSchema } from '$lib/server/db/schema-type';
	import { StatusEnum } from '$lib/model/enum/db-link';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let documentResult =
		$state<PaginatedResult<DocumentWithRelations> | null>(null);
	let documentTypes = $state<DocumentTypeSchema[]>([]);
	let documentSettings = $state<DocumentSettingWithRelations[]>([]);
	let currentPage = $state(1);
	let filterPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let isLoading = $state(false);

	type ViewMode = 'list' | 'create' | 'edit' | 'view';
	let viewMode = $state<ViewMode>('list');
	let editingId = $state<number | null>(null);
	let documentTypeIdInput = $state('');
	let documentSettingIdInput = $state('');
	let documentCodeInput = $state('');
	let documentNumberInput = $state('');
	let documentTextInput = $state('');

type ContentTab = 'rich' | 'html' | 'preview';
let contentTab = $state<ContentTab>('rich');

	const documentList = $derived(documentResult?.data ?? []);
	const total = $derived(documentResult?.total ?? 0);

	const selectedDocumentTypeName = $derived(() => {
		if (!documentTypeIdInput) return 'Document';
		const dt = documentTypes.find(
			(d) => String(d.id) === documentTypeIdInput
		);
		return dt?.documentType || 'Document';
	});

	async function fetchData(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		const parsedStatusId = tableFilters.status
			? Number(tableFilters.status)
			: undefined;
		try {
			documentResult = await getDocumentsPaginatedWithRelations({
				page: currentPage,
				pageSize,
				statusId:
					parsedStatusId != null && Number.isFinite(parsedStatusId)
						? parsedStatusId
						: undefined,
				...(opts?.bustCache && { _t: Date.now() })
			});
		} finally {
			isLoading = false;
		}
	}

	async function fetchDocumentTypes() {
		try {
			documentTypes = await getDocumentTypes();
		} catch (err) {
			console.error('Failed to load document types', err);
		}
	}

	async function fetchDocumentSettings() {
		try {
			documentSettings = await getDocumentSettingsWithRelations();
		} catch (err) {
			console.error('Failed to load document settings', err);
		}
	}

	lifeCycleUtil.onMount(() => {
		fetchData();
		fetchDocumentTypes();
		fetchDocumentSettings();
	});

	function resetForm() {
		viewMode = 'list';
		editingId = null;
		documentTypeIdInput = '';
		documentSettingIdInput = '';
		documentCodeInput = '';
		documentNumberInput = '';
		documentTextInput = '';
	}

	function startEdit(item: DocumentWithRelations) {
		viewMode = 'edit';
		editingId = item.id;
		documentTypeIdInput = item.documentTypeId
			? String(item.documentTypeId)
			: '';
		documentSettingIdInput = item.documentSettingId
			? String(item.documentSettingId)
			: '';
		documentCodeInput = item.code ?? '';
		documentNumberInput = item.documentNumber ?? '';
		documentTextInput = item.documentText ?? '';
		contentTab = 'rich';
	}

	function startView(item: DocumentWithRelations) {
		viewMode = 'view';
		editingId = item.id;
		documentTypeIdInput = item.documentTypeId
			? String(item.documentTypeId)
			: '';
		documentSettingIdInput = item.documentSettingId
			? String(item.documentSettingId)
			: '';
		documentCodeInput = item.code ?? '';
		documentNumberInput = item.documentNumber ?? '';
		documentTextInput = item.documentText ?? '';
		contentTab = 'preview';
	}

	function startCreate() {
		resetForm();
		viewMode = 'create';
		contentTab = 'rich';
	}

	async function handleSave() {
		if (!documentTypeIdInput) {
			toastService.addToast(
				'Document type is required',
				StatusColorEnum.WARNING
			);
			return;
		}
		if (!documentNumberInput.trim()) {
			toastService.addToast(
				'Document number/name is required',
				StatusColorEnum.WARNING
			);
			return;
		}
		try {
			const payload = {
				documentTypeId: Number(documentTypeIdInput),
				documentSettingId: documentSettingIdInput
					? Number(documentSettingIdInput)
					: null,
				code: documentCodeInput.trim() || null,
				documentNumber: documentNumberInput.trim(),
				documentText: documentTextInput || null
			};

			if (editingId) {
				await updateDocument({
					id: editingId,
					...payload
				});
				toastService.addToast(
					'Document updated',
					StatusColorEnum.SUCCESS
				);
			} else {
				await createDocument(payload);
				toastService.addToast(
					'Document created',
					StatusColorEnum.SUCCESS
				);
			}
			resetForm();
			await fetchData({ bustCache: true });
		} catch (err) {
			console.error(err);
			toastService.addToast(
				'Failed to save document',
				StatusColorEnum.ERROR
			);
		}
	}

	async function handleDelete(id: number) {
		try {
			const result = await dialogService.open({
				title: 'Delete Document',
				message: 'Are you sure you want to delete this document?',
				variant: DialogVariantEnum.CONFIRM
			});
			if (result.confirmed) {
				await deleteDocument({ id });
				await fetchData({ bustCache: true });
				toastService.addToast(
					'Document deleted',
					StatusColorEnum.SUCCESS
				);
			}
		} catch (err) {
			console.error(err);
			toastService.addToast(
				'Failed to delete document',
				StatusColorEnum.ERROR
			);
		}
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return '—';
		try {
			const d = new Date(value);
			return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
		} catch {
			return '—';
		}
	}

	function truncateText(
		text: string | null | undefined,
		maxLength: number = 100
	): string {
		if (!text) return '—';
		const stripped = text.replace(/<[^>]*>/g, '');
		if (stripped.length <= maxLength) return stripped;
		return stripped.substring(0, maxLength) + '...';
	}

	function formatHtmlForEditor(value: string): string {
		const trimmed = value.trim();
		if (!trimmed) return '';
		try {
			const parser = new DOMParser();
			const parsed = parser.parseFromString(trimmed, 'text/html');
			const formatNode = (node: Node, depth: number): string => {
				const indent = '  '.repeat(depth);
				if (node.nodeType === Node.TEXT_NODE) {
					const text = node.textContent?.trim() ?? '';
					return text ? `${indent}${text}\n` : '';
				}
				if (node.nodeType !== Node.ELEMENT_NODE) return '';
				const el = node as HTMLElement;
				const attrs = Array.from(el.attributes)
					.map((a) => ` ${a.name}="${a.value}"`)
					.join('');
				const tagName = el.tagName.toLowerCase();
				const children = Array.from(el.childNodes)
					.map((child) => formatNode(child, depth + 1))
					.join('');
				if (!children.trim()) {
					return `${indent}<${tagName}${attrs}></${tagName}>\n`;
				}
				return `${indent}<${tagName}${attrs}>\n${children}${indent}</${tagName}>\n`;
			};

			const bodyChildren = Array.from(parsed.body.childNodes)
				.map((child) => formatNode(child, 0))
				.join('')
				.trim();
			return bodyChildren || trimmed;
		} catch {
			return trimmed;
		}
	}

	function switchToHtmlTab() {
		contentTab = 'html';
		documentTextInput = formatHtmlForEditor(documentTextInput);
	}

	function handleFormatHtmlClick() {
		documentTextInput = formatHtmlForEditor(documentTextInput);
		toastService.addToast('HTML formatted', StatusColorEnum.SUCCESS);
	}

	let tableFilters = $state<Record<string, string>>({});

	const columns: MariTableColumn<DocumentWithRelations>[] = [
		{
			id: 'id',
			header: 'ID',
			widthClass: 'w-16 min-w-[4rem]',
			filterable: false
		},
		{
			id: 'documentNumber',
			header: 'Document Name',
			widthClass: 'w-48 min-w-[12rem]',
			filterable: false
		},
		{
			id: 'code',
			header: 'Document Code',
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false
		},
		{
			id: 'documentType',
			header: 'Document Type',
			widthClass: 'w-32 min-w-[8rem]',
			filterable: false,
			format: (_value, row) => row.documentType?.documentType ?? '—'
		},
		{
			id: 'documentSetting',
			header: 'Document Setting',
			widthClass: 'w-48 min-w-[12rem]',
			filterable: false,
			format: (_value, row) => row.documentSetting?.name ?? '—'
		},
		{
			id: 'status',
			header: 'Status',
			widthClass: 'w-28 min-w-[7rem]',
			filterable: true,
			filterType: 'select',
			filterOptions: [
				{ label: 'Active', value: String(StatusEnum.ACTIVE) },
				{ label: 'Inactive', value: String(StatusEnum.INACTIVE) }
			],
			defaultFilterValue: String(StatusEnum.ACTIVE),
			format: (_value, row) =>
				row.statusId === StatusEnum.ACTIVE
					? 'Active'
					: row.statusId === StatusEnum.INACTIVE
						? 'Inactive'
						: row.statusId === StatusEnum.DELETED
							? 'Deleted'
							: `Status ${row.statusId ?? 'Unknown'}`
		},
		{
			id: 'documentText',
			header: 'Content Preview',
			widthClass: 'w-64 min-w-[16rem]',
			filterable: false,
			format: (value) => truncateText(value as string)
		},
		{
			id: 'createdAt',
			header: 'Created At',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) => formatDateTime(value as any)
		}
	];
</script>

<div class="space-y-6">
	{#if viewMode === 'list'}
		<div class="flex flex-wrap items-center justify-between gap-4">
			<h1 class="text-2xl font-bold">Documents</h1>
			<DaisyUiButton
				className="d-btn-outline d-btn-sm d-btn-square"
				onClick={startCreate}
			>
				<LucidePlus />
			</DaisyUiButton>
		</div>

		<DaisyUiCard>
			<DaisyUiCardBody>
			<div class="mb-2 flex items-center justify-between">
				<h2 class="text-base font-semibold">Document list</h2>
				<DaisyUiButton
					className="d-btn-primary d-btn-sm"
					onClick={startCreate}
				>
					<LucidePlus className="size-5" />
					{m.create()}
				</DaisyUiButton>
			</div>
			</DaisyUiCardBody>
		</DaisyUiCard>

		{#if isLoading && !documentResult}
			<div class="flex items-center justify-center">
				<DaisyUiLoading className="d-loading-xl" />
			</div>
		{:else}
			<DaisyUiCard>
				<DaisyUiCardBody>
					<div class="{TableEnum.HEIGHT} overflow-auto">
						<MariTable
							rows={documentList}
							{columns}
							{isLoading}
							bind:pageSize={filterPageSize}
							bind:currentPage
							totalRowCount={total}
							showRefreshButton={true}
							refreshTooltip={m.refresh_data()}
							emptyMessage="No documents found"
							showRowActions={true}
							actionsHeader={m.actions()}
							actionsVariant="none"
							enableColumnFilters={true}
							useRemoteFilters={true}
							on:refresh={() => fetchData({ bustCache: true })}
							on:pageSizeChange={() => {
								currentPage = 1;
								fetchData();
							}}
							on:pageChange={() => fetchData()}
							on:filtersChange={(e) => {
								tableFilters = e.detail.filters;
								currentPage = 1;
								fetchData();
							}}
						>
							<svelte:fragment slot="rowActions" let:row>
								{@const typedRow = row as DocumentWithRelations}
								<td class="w-28 shrink-0 text-right">
									<div class="flex justify-end gap-1">
								<DaisyUiTooltip
									tooltipText={m.view_data()}
									className="d-tooltip-ghost d-tooltip-top"
								>
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm"
										onClick={() => startView(typedRow)}
									>
										<LucideEye className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
								<DaisyUiTooltip
									tooltipText={m.edit_data()}
									className="d-tooltip-accent d-tooltip-top"
								>
									<DaisyUiButton
										className="d-btn-sm d-btn-ghost d-btn-accent"
										onClick={() => startEdit(typedRow)}
									>
										<LucidePencil className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
								<DaisyUiTooltip
									tooltipText={m.delete_data()}
									className="d-tooltip-error d-tooltip-top"
								>
									<DaisyUiButton
										className="d-btn-ghost d-btn-sm d-btn-error"
										disabled={isLoading}
										onClick={() => handleDelete(typedRow.id)}
									>
										<LucideTrash2 className="size-5" />
									</DaisyUiButton>
								</DaisyUiTooltip>
									</div>
								</td>
							</svelte:fragment>
						</MariTable>
					</div>
				</DaisyUiCardBody>
			</DaisyUiCard>
		{/if}
	{:else}
		<DaisyUiCard>
			<DaisyUiCardBody>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold">
					{#if viewMode === 'view'}
						View Document
					{:else if viewMode === 'edit'}
						Edit Document
					{:else}
						Create Document
					{/if}
				</h2>
				<DaisyUiButton
					className="d-btn-ghost d-btn-sm"
					onClick={resetForm}
				>
					<LucideX className="size-5" />
					Back to List
				</DaisyUiButton>
			</div>

			<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="documentType"
						className="shrink-0 sm:w-32"
					>
						Document Type <span class="text-error">*</span>
					</DaisyUiLabel>
					<div class="flex-1">
						<DaisyUiSelect
							bind:value={documentTypeIdInput}
							optionHeader="Select document type ..."
							disabled={viewMode === 'view'}
						>
							{#each documentTypes as dt (dt.id)}
								<option value={String(dt.id)}
									>{dt.documentType}</option
								>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="documentCode"
						className="shrink-0 sm:w-32"
					>
						Document Code
					</DaisyUiLabel>
					<div class="flex-1">
						<input
							id="documentCode"
							type="text"
							class="d-input-bordered d-input w-full"
							placeholder="Enter document code"
							bind:value={documentCodeInput}
							disabled={viewMode === 'view'}
						/>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="documentSetting"
						className="shrink-0 sm:w-32"
					>
						Document Setting
					</DaisyUiLabel>
					<div class="flex-1">
						<DaisyUiSelect
							bind:value={documentSettingIdInput}
							optionHeader="Select document setting ..."
							disabled={viewMode === 'view'}
						>
							{#each documentSettings as ds (ds.id)}
								<option value={String(ds.id)}>{ds.name}</option>
							{/each}
						</DaisyUiSelect>
					</div>
				</div>
				<div
					class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="documentNumber"
						className="shrink-0 sm:w-32"
					>
						Document Name <span class="text-error">*</span>
					</DaisyUiLabel>
					<div class="flex-1">
						<input
							id="documentNumber"
							type="text"
							class="d-input-bordered d-input w-full"
							placeholder="Enter document name"
							bind:value={documentNumberInput}
							disabled={viewMode === 'view'}
						/>
					</div>
				</div>
			</div>

			<div class="mb-4">
				<DaisyUiLabel
					forText="documentContent"
					className="mb-2 block"
				>
					Document Content
				</DaisyUiLabel>

				{#if viewMode === 'view'}
					<div class="overflow-hidden rounded-lg border">
						<div class="document-preview-content min-h-[400px] bg-base-100 p-4">
							{@html documentTextInput ||
								'<p class="text-base-content/50">No content</p>'}
						</div>
					</div>
				{:else}
					<div class="mb-2 flex gap-2">
						<button
							type="button"
							class="d-btn d-btn-xs {contentTab === 'rich'
								? 'd-btn-primary'
								: 'd-btn-ghost'}"
							onclick={() => (contentTab = 'rich')}
						>
							Rich editor
						</button>
						<button
							type="button"
							class="d-btn d-btn-xs {contentTab === 'html'
								? 'd-btn-primary'
								: 'd-btn-ghost'}"
							onclick={switchToHtmlTab}
						>
							HTML
						</button>
						<button
							type="button"
							class="d-btn d-btn-xs {contentTab === 'preview'
								? 'd-btn-primary'
								: 'd-btn-ghost'}"
							onclick={() => (contentTab = 'preview')}
						>
							Preview
						</button>
						<button
							type="button"
							class="d-btn d-btn-xs d-btn-outline"
							onclick={handleFormatHtmlClick}
						>
							Format HTML
						</button>
					</div>

					<div class="overflow-hidden rounded-lg border">
						{#if contentTab === 'rich'}
							<MariRichEditor
								bind:value={documentTextInput}
								placeholder="Start typing your document content..."
								showMenuBar={true}
								documentTitle={selectedDocumentTypeName()}
								className="min-h-[400px]"
							/>
						{:else if contentTab === 'html'}
							<textarea
								class="d-textarea d-textarea-bordered h-[400px] w-full font-mono text-sm"
								bind:value={documentTextInput}
								placeholder="Edit raw HTML here..."
							></textarea>
						{:else}
							<div class="document-preview-content min-h-[400px] bg-base-100 p-4">
								{@html documentTextInput ||
									'<p class="text-base-content/50">No content</p>'}
							</div>
						{/if}
					</div>
				{/if}
			</div>

			{#if viewMode !== 'view'}
				<div class="flex justify-end gap-2 border-t border-base-300 pt-4">
					<DaisyUiButton
						className="d-btn-ghost d-btn-sm"
						onClick={resetForm}
					>
						Cancel
					</DaisyUiButton>
					<DaisyUiButton
						className="d-btn-primary d-btn-sm"
						onClick={handleSave}
					>
						{editingId ? 'Update' : 'Create'}
					</DaisyUiButton>
				</div>
			{/if}
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}
</div>

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
