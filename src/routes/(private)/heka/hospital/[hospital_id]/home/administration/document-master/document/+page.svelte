<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
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
	import type { DocumentTypeSchema } from '$lib/server/db/schema-type';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let documentResult =
		$state<PaginatedResult<DocumentWithRelations> | null>(null);
	let documentTypes = $state<DocumentTypeSchema[]>([]);
	let currentPage = $state(1);
	let filterPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let isLoading = $state(false);

	type ViewMode = 'list' | 'create' | 'edit' | 'view';
	let viewMode = $state<ViewMode>('list');
	let editingId = $state<number | null>(null);
	let documentTypeIdInput = $state('');
	let documentNumberInput = $state('');
	let documentTextInput = $state('');

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
		try {
			documentResult = await getDocumentsPaginatedWithRelations({
				page: currentPage,
				pageSize,
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

	lifeCycleUtil.onMount(() => {
		fetchData();
		fetchDocumentTypes();
	});

	function resetForm() {
		viewMode = 'list';
		editingId = null;
		documentTypeIdInput = '';
		documentNumberInput = '';
		documentTextInput = '';
	}

	function startEdit(item: DocumentWithRelations) {
		viewMode = 'edit';
		editingId = item.id;
		documentTypeIdInput = item.documentTypeId
			? String(item.documentTypeId)
			: '';
		documentNumberInput = item.documentNumber ?? '';
		documentTextInput = item.documentText ?? '';
	}

	function startView(item: DocumentWithRelations) {
		viewMode = 'view';
		editingId = item.id;
		documentTypeIdInput = item.documentTypeId
			? String(item.documentTypeId)
			: '';
		documentNumberInput = item.documentNumber ?? '';
		documentTextInput = item.documentText ?? '';
	}

	function startCreate() {
		resetForm();
		viewMode = 'create';
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

	const columns: MariTableColumn<DocumentWithRelations>[] = [
		{
			id: 'id',
			header: 'ID',
			widthClass: 'w-16 min-w-[4rem]'
		},
		{
			id: 'documentNumber',
			header: 'Document Name',
			widthClass: 'w-48 min-w-[12rem]'
		},
		{
			id: 'documentType',
			header: 'Document Type',
			widthClass: 'w-32 min-w-[8rem]',
			format: (_value, row) => row.documentType?.documentType ?? '—'
		},
		{
			id: 'documentText',
			header: 'Content Preview',
			widthClass: 'w-64 min-w-[16rem]',
			format: (value) => truncateText(value as string)
		},
		{
			id: 'createdAt',
			header: 'Created At',
			widthClass: 'w-40 min-w-[10rem]',
			format: (value) => formatDateTime(value as any)
		}
	];
</script>

<div class="flex flex-col gap-4 p-4">
	{#if viewMode === 'list'}
		<DaisyUiCard className="p-4">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold">Documents</h2>
				<DaisyUiButton
					className="d-btn-primary d-btn-sm"
					onClick={startCreate}
				>
					<LucidePlus className="size-5" />
					{m.create()}
				</DaisyUiButton>
			</div>
		</DaisyUiCard>

		{#if isLoading && !documentResult}
			<div class="flex items-center justify-center">
				<DaisyUiLoading className="d-loading-xl" />
			</div>
		{:else}
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
					enableColumnFilters={false}
					useRemoteFilters={true}
					on:refresh={() => fetchData({ bustCache: true })}
					on:pageSizeChange={() => {
						currentPage = 1;
						fetchData();
					}}
					on:pageChange={() => fetchData()}
				>
					<svelte:fragment slot="rowActions" let:row>
						{@const typedRow = row as DocumentWithRelations}
						<td
							class="sticky left-0 z-2 w-16 min-w-[4rem] bg-base-100"
						>
							<div class="flex flex-col items-center gap-1">
								<DaisyUiTooltip
									tooltipText={m.view_data()}
									className="d-tooltip-ghost d-tooltip-right"
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
									className="d-tooltip-accent d-tooltip-right"
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
									className="d-tooltip-error d-tooltip-right"
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
		{/if}
	{:else}
		<DaisyUiCard className="p-4">
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

			<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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
				<div class="overflow-hidden rounded-lg border">
					{#if viewMode === 'view'}
						<div class="min-h-[400px] bg-base-100 p-4">
							{@html documentTextInput ||
								'<p class="text-base-content/50">No content</p>'}
						</div>
					{:else}
						<MariRichEditor
							bind:value={documentTextInput}
							placeholder="Start typing your document content..."
							showMenuBar={true}
							documentTitle={selectedDocumentTypeName()}
							className="min-h-[400px]"
						/>
					{/if}
				</div>
			</div>

			{#if viewMode !== 'view'}
				<div class="flex justify-end gap-2">
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
		</DaisyUiCard>
	{/if}
</div>
