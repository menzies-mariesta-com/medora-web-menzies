<script lang="ts">
	import DaisyUiButton from '$lib/component/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiLoading from '$lib/component/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/daisyui/tooltip/DaisyUiTooltip.svelte';
	import DaisyUiCard from '$lib/component/daisyui/card/DaisyUiCard.svelte';
	import DaisyUiCardBody from '$lib/component/daisyui/card/body/DaisyUiCardBody.svelte';
	import LucidePencil from '$lib/component/own/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/own/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/own/library/lucide/LucidePlus.svelte';
	import LucideX from '$lib/component/own/library/lucide/LucideX.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/own/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { m } from '$lib/paraglide/messages';
	import type { PaginatedResult } from '$lib/tool/remote/table/pagination-type';
	import type { DocumentTypeSchema } from '$lib/server/db/schema-type';
	import {
		getDocumentTypesPaginated,
		createDocumentType,
		updateDocumentType,
		deleteDocumentType
	} from '$lib/tool/remote/table/information-table/document-type.http.tool.svelte';
	import { StatusEnum } from '$lib/model/enum/db-link';

	const lifeCycleUtil = new LifeCycleUtil();
	const toastService = new ToastService();

	let docTypeResult =
		$state<PaginatedResult<DocumentTypeSchema> | null>(null);
	let currentPage = $state(1);
	let filterPageSize = $state(
		`${AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE}`
	);
	let isLoading = $state(false);

	let isEditing = $state(false);
	let editingId = $state<number | null>(null);
	let nameInput = $state('');

	const docTypeList = $derived(docTypeResult?.data ?? []);
	const total = $derived(docTypeResult?.total ?? 0);

	let tableFilters = $state<Record<string, string>>({});

	async function fetchData(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		const parsedStatusId = tableFilters.status
			? Number(tableFilters.status)
			: undefined;
		try {
			docTypeResult = await getDocumentTypesPaginated({
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

	lifeCycleUtil.onMount(() => {
		fetchData();
	});

	function resetForm() {
		isEditing = false;
		editingId = null;
		nameInput = '';
	}

	function startEdit(item: DocumentTypeSchema) {
		isEditing = true;
		editingId = item.id;
		nameInput = item.documentType ?? '';
	}

	function startCreate() {
		resetForm();
		isEditing = true;
	}

	async function handleSave() {
		if (!nameInput.trim()) {
			toastService.addToast(
				'Name is required',
				StatusColorEnum.WARNING
			);
			return;
		}
		try {
			if (editingId) {
				await updateDocumentType({
					id: editingId,
					documentType: nameInput.trim()
				});
				toastService.addToast(
					'Document type updated',
					StatusColorEnum.SUCCESS
				);
			} else {
				await createDocumentType({
					documentType: nameInput.trim()
				});
				toastService.addToast(
					'Document type created',
					StatusColorEnum.SUCCESS
				);
			}
			resetForm();
			await fetchData({ bustCache: true });
		} catch (err) {
			console.error(err);
			toastService.addToast(
				'Failed to save document type',
				StatusColorEnum.ERROR
			);
		}
	}

	async function handleDelete(id: number) {
		try {
			const result = await dialogService.open({
				title: 'Delete Document Type',
				message:
					'Are you sure you want to delete this document type?',
				variant: DialogVariantEnum.CONFIRM
			});
			if (result.confirmed) {
				await deleteDocumentType({ id });
				await fetchData({ bustCache: true });
				toastService.addToast(
					'Document type deleted',
					StatusColorEnum.SUCCESS
				);
			}
		} catch (err) {
			console.error(err);
			toastService.addToast(
				'Failed to delete document type',
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

	const columns: MariTableColumn<DocumentTypeSchema>[] = [
		{
			id: 'displayNo',
			header: 'No',
			widthClass: 'w-14 min-w-[3.5rem]',
			filterable: false,
			format: (_v, _row, rowIndex) =>
				(currentPage - 1) *
					(Number(filterPageSize) || AppEnum.DEFAULT_PAGE_SIZE_FOR_TABLE) +
				rowIndex +
				1
		},
		{
			id: 'documentType',
			header: 'Name',
			widthClass: 'w-64 min-w-[16rem]',
			filterable: false
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
			id: 'createdAt',
			header: 'Created At',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) => formatDateTime(value as any)
		},
		{
			id: 'updatedAt',
			header: 'Updated At',
			widthClass: 'w-40 min-w-[10rem]',
			filterable: false,
			format: (value) => formatDateTime(value as any)
		}
	];
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">Document types</h1>
		<DaisyUiButton
			className="d-btn-outline d-btn-sm d-btn-square"
			onClick={startCreate}
		>
			<LucidePlus />
		</DaisyUiButton>
	</div>

	{#if isEditing}
		<DaisyUiCard>
			<DaisyUiCardBody>
				<div class="mb-3 text-base font-semibold">
					{editingId ? 'Edit document type' : 'Create document type'}
				</div>
				<div class="flex flex-col gap-4">
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<DaisyUiLabel
							forText="docTypeName"
							className="text-sm font-medium"
						>
							Name <span class="text-error">*</span>
						</DaisyUiLabel>
						<DaisyUiInputField
							id="docTypeName"
							bind:value={nameInput}
							inputType="text"
							inputPlaceholderText="Enter document type name"
							className="d-input-sm w-full"
						/>
					</div>
					<div
						class="flex justify-end gap-2 border-t border-base-300 pt-4"
					>
						<DaisyUiButton
							className="d-btn-ghost d-btn-sm"
							onClick={resetForm}
						>
							<LucideX className="size-4" />
							{m.cancel()}
						</DaisyUiButton>
						<DaisyUiButton
							className="d-btn-primary d-btn-sm"
							onClick={handleSave}
						>
							{editingId ? 'Update' : 'Create'}
						</DaisyUiButton>
					</div>
				</div>
			</DaisyUiCardBody>
		</DaisyUiCard>
	{/if}

	<DaisyUiCard>
		<DaisyUiCardBody>
			{#if isLoading && !docTypeResult}
				<div class="flex items-center justify-center py-8">
					<DaisyUiLoading className="d-loading-xl" />
				</div>
			{:else}
				<div class="{TableEnum.HEIGHT} overflow-auto">
					<MariTable
						rows={docTypeList}
						{columns}
						{isLoading}
						bind:pageSize={filterPageSize}
						bind:currentPage
						totalRowCount={total}
						showRefreshButton={true}
						refreshTooltip={m.refresh_data()}
						emptyMessage="No document types found"
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
						{#snippet rowActions(row, rowIndex)}
							{@const typedRow = row as DocumentTypeSchema}
							<td class="w-24 shrink-0 text-right">
								<div class="flex justify-end gap-1">
									<DaisyUiTooltip
										tooltipText={m.edit_data()}
										className="d-tooltip-accent d-tooltip-top"
									>
										<DaisyUiButton
											className="d-btn-sm d-btn-ghost d-btn-accent"
											onClick={() => startEdit(typedRow)}
										>
											<LucidePencil className="size-4" />
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
											<LucideTrash2 className="size-4" />
										</DaisyUiButton>
									</DaisyUiTooltip>
								</div>
							</td>
						{/snippet}
					</MariTable>
				</div>
			{/if}
		</DaisyUiCardBody>
	</DaisyUiCard>
</div>
