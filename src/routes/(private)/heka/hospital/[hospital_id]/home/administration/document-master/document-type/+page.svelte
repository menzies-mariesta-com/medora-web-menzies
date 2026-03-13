<script lang="ts">
	import DaisyUiButton from '$lib/component/library/daisyui/button/DaisyUiButton.svelte';
	import DaisyUiInputField from '$lib/component/library/daisyui/inputfield/DaisyUiInputField.svelte';
	import DaisyUiLabel from '$lib/component/library/daisyui/label/DaisyUiLabel.svelte';
	import DaisyUiLoading from '$lib/component/library/daisyui/loading/DaisyUiLoading.svelte';
	import DaisyUiTooltip from '$lib/component/library/daisyui/tooltip/DaisyUiTooltip.svelte';
	import DaisyUiCard from '$lib/component/library/daisyui/card/DaisyUiCard.svelte';
	import LucidePencil from '$lib/component/library/lucide/LucidePencil.svelte';
	import LucideTrash2 from '$lib/component/library/lucide/LucideTrash2.svelte';
	import LucidePlus from '$lib/component/library/lucide/LucidePlus.svelte';
	import LucideX from '$lib/component/library/lucide/LucideX.svelte';
	import MariTable, {
		type MariTableColumn
	} from '$lib/component/library/mari/table/MariTable.svelte';
	import { TableEnum } from '$lib/model/enum/table.enum';
	import { AppEnum } from '$lib/model/enum/app.enum';
	import { LifeCycleUtil } from '$lib/util/life-cycle.util.svelte';
	import { dialogService } from '$lib/service/dialog.service.svelte';
	import { ToastService } from '$lib/service/toast.service.svelte';
	import { StatusColorEnum } from '$lib/model/enum/color.enum';
	import { DialogVariantEnum } from '$lib/model/enum/dialog.enum';
	import { m } from '$lib/paraglide/messages';
	import type { PaginatedResult } from '$lib/remote/table/pagination-type';
	import type { DocumentTypeSchema } from '$lib/server/db/schema-type';
	import {
		getDocumentTypesPaginated,
		createDocumentType,
		updateDocumentType,
		deleteDocumentType
	} from '$lib/remote/table/information-table/document-type.remote';

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

	async function fetchData(opts?: { bustCache?: boolean }) {
		isLoading = true;
		const pageSize = Number(filterPageSize) || 10;
		try {
			docTypeResult = await getDocumentTypesPaginated({
				page: currentPage,
				pageSize,
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
			id: 'id',
			header: 'ID',
			widthClass: 'w-20 min-w-[5rem]'
		},
		{
			id: 'documentType',
			header: 'Name',
			widthClass: 'w-64 min-w-[16rem]'
		},
		{
			id: 'createdAt',
			header: 'Created At',
			widthClass: 'w-40 min-w-[10rem]',
			format: (value) => formatDateTime(value as any)
		},
		{
			id: 'updatedAt',
			header: 'Updated At',
			widthClass: 'w-40 min-w-[10rem]',
			format: (value) => formatDateTime(value as any)
		}
	];
</script>

<div class="flex flex-col gap-4 p-4">
	<DaisyUiCard className="p-4">
		<h2 class="mb-4 text-lg font-semibold">
			{isEditing
				? editingId
					? 'Edit Document Type'
					: 'Create Document Type'
				: 'Document Type'}
		</h2>
		{#if isEditing}
			<div class="flex items-end gap-4">
				<div
					class="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
				>
					<DaisyUiLabel
						forText="docTypeName"
						className="shrink-0 sm:w-24"
						>Name <span class="text-error">*</span></DaisyUiLabel
					>
					<div class="flex-1">
						<DaisyUiInputField
							id="docTypeName"
							bind:value={nameInput}
							inputType="text"
							inputPlaceholderText="Enter document type name"
						/>
					</div>
				</div>
				<DaisyUiButton
					className="d-btn-primary d-btn-sm"
					onClick={handleSave}
				>
					{editingId ? 'Update' : 'Create'}
				</DaisyUiButton>
				<DaisyUiButton
					className="d-btn-ghost d-btn-sm"
					onClick={resetForm}
				>
					<LucideX className="size-5" />
					Cancel
				</DaisyUiButton>
			</div>
		{:else}
			<div class="flex justify-end">
				<DaisyUiButton
					className="d-btn-primary d-btn-sm"
					onClick={startCreate}
				>
					<LucidePlus className="size-5" />
					{m.create()}
				</DaisyUiButton>
			</div>
		{/if}
	</DaisyUiCard>

	{#if isLoading && !docTypeResult}
		<div class="flex items-center justify-center">
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
					{@const typedRow = row as DocumentTypeSchema}
					<td class="sticky left-0 z-2 w-16 min-w-[4rem] bg-base-100">
						<div class="flex flex-col items-center gap-1">
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
</div>
